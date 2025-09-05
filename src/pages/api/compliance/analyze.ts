import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import { retrieveWithExpansion } from '@/lib/compliance/retrieval';
import { Result, ResultType } from '@/lib/compliance/schema';
import { getPromptForTemplate, formatPrompt, COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';
import { renderPrompt } from '@/lib/prompts';

interface AnalyzeRequest {
  check_id?: string;
  documentId?: string;
  templateId?: string;
  whitepaperSection?: string;
}



async function analyzeItemWithContent(
  item: any,
  documentContent: string,
  templateType: string,
  retries: number = 2
): Promise<ResultType> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Use centralized prompt system for all template types
  let userPrompt: string;
  try {
    const promptId = templateType === 'whitepaper' ? 'WHITEPAPER_ANALYSIS' : 
                    templateType === 'legal' ? 'LEGAL_ANALYSIS' : 'COMPLIANCE_ANALYSIS';
    
    // Legal prompts have requirements hardcoded, only need documentContent
    if (templateType === 'legal') {
      userPrompt = await renderPrompt(promptId, {
        documentContent: documentContent
      });
    } else {
      userPrompt = await renderPrompt(promptId, {
        requirementsList: `Category: ${item.category}\nItem: ${item.item_name}\nDescription: ${item.description}`,
        documentContent: documentContent
      });
    }
  } catch (error) {
    // Fallback to old system if centralized prompt fails
    const promptTemplate = getPromptForTemplate(templateType);
    userPrompt = formatPrompt(promptTemplate, {
      category: item.category,
      item_name: item.item_name,
      description: item.description,
      relevant_content: documentContent
    });
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: COMPLIANCE_PROMPTS.SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse and validate JSON response
      const parsed = JSON.parse(content);
      const validated = Result.parse(parsed);

      return validated;

    } catch (error: any) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries) {
        // Final fallback
        return {
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
          evidence: [],
          reasoning: `Analysis failed after ${retries + 1} attempts: ${error.message}`,
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error('Should not reach here');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { check_id, documentId, templateId, whitepaperSection }: AnalyzeRequest = req.body;

    // Handle both existing check analysis and new document analysis
    if (!check_id && (!documentId || !templateId)) {
      return res.status(400).json({ error: 'Either check_id or (documentId + templateId) is required' });
    }

    // If documentId provided, create a temporary check
    if (documentId && templateId) {
      // Create temporary check for analysis
      const { data: tempCheck, error: tempError } = await serviceClient
        .from('compliance_checks')
        .insert({
          user_id: user.id,
          document_id: documentId,
          template_id: templateId,
          status: 'processing'
        })
        .select('*, checker_templates(*)')
        .single();

      if (tempError || !tempCheck) {
        return res.status(400).json({ error: 'Failed to create temporary check' });
      }

      // Use the temporary check
      const checkData = tempCheck;
      const actualCheckId = tempCheck.id;

      // Continue with existing logic...
      const { data: items, error: itemsError } = await serviceClient
        .from('checker_items')
        .select('*')
        .eq('template_id', checkData.template_id)
        .order('sort_order');

      if (itemsError || !items) {
        throw new Error('Failed to load checklist items');
      }

      // Get document chunks - if none exist, try to process the document
      let { data: allChunks } = await serviceClient
        .from('compliance_chunks')
        .select('content, page')
        .eq('check_id', actualCheckId)
        .order('page');

      if (!allChunks || allChunks.length === 0) {
        // Try to get chunks from document directly
        const { data: docChunks } = await serviceClient
          .from('compliance_chunks')
          .select('content, page')
          .eq('document_id', documentId)
          .order('page')
          .limit(43);

        if (docChunks && docChunks.length > 0) {
          // Copy chunks to this check
          const chunksToInsert = docChunks.map(chunk => ({
            check_id: actualCheckId,
            document_id: documentId,
            content: chunk.content,
            page: chunk.page
          }));

          await serviceClient.from('compliance_chunks').insert(chunksToInsert);
          allChunks = docChunks;
        } else {
          return res.status(400).json({ 
            error: 'No document chunks found. Please re-upload the document.' 
          });
        }
      }

      // Continue with analysis using existing logic
      const documentContent = allChunks.map((chunk, i) => 
        `[Excerpt ${i + 1}${chunk.page ? ` - Page ${chunk.page}` : ''}]\n${chunk.content}`
      ).join('\n\n');

      console.log(`Using ${allChunks.length} chunks for analysis (${documentContent.length} chars)`);

      const results = [];
      let processedCount = 0;

      // Process each item with the same documentContent
      for (const item of items) {
        try {
          const analysis = await analyzeItemWithContent(item, documentContent, checkData.checker_templates.type);

          results.push({
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: analysis.status,
            coverage_score: analysis.coverage_score,
            reasoning: analysis.reasoning,
            evidence: analysis.evidence || []
          });

          processedCount++;
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
          console.error(`Failed to analyze item ${item.id}:`, error);
          
          results.push({
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Analysis failed: ${error.message}`,
            evidence: []
          });
        }
      }

      // Calculate summary
      const summary = {
        found_items: results.filter(r => r.status === 'FOUND').length,
        clarification_items: results.filter(r => r.status === 'NEEDS_CLARIFICATION').length,
        missing_items: results.filter(r => r.status === 'MISSING').length,
        overall_score: Math.round(results.reduce((sum, r) => sum + r.coverage_score, 0) / results.length)
      };

      // Clean up temporary check
      await serviceClient.from('compliance_checks').delete().eq('id', actualCheckId);

      return res.status(200).json({
        success: true,
        checkId: `temp-${Date.now()}`,
        results,
        summary,
        message: `Analysis completed for ${processedCount}/${items.length} items (temporary)`
      });
    }

    // Handle existing check analysis
    const { data: checkData, error: checkError } = await serviceClient
      .from('compliance_checks')
      .select('*, checker_templates(*)')
      .eq('id', check_id!)
      .eq('user_id', user.id)
      .single();

    if (checkError || !checkData) {
      return res.status(404).json({ error: 'Check not found' });
    }

    if (checkData.status !== 'ready') {
      return res.status(400).json({ error: 'Check is not ready for analysis' });
    }

    const actualCheckId = check_id!;

    // Get checklist items for this template
    const { data: items, error: itemsError } = await serviceClient
      .from('checker_items')
      .select('*')
      .eq('template_id', checkData.template_id)
      .order('sort_order');

    if (itemsError || !items) {
      throw new Error('Failed to load checklist items');
    }

    // Get ALL chunks once for the entire analysis
    const { data: allChunks } = await serviceClient
      .from('compliance_chunks')
      .select('content, page')
      .eq('check_id', actualCheckId)
      .order('page');

    if (!allChunks || allChunks.length === 0) {
      return res.status(400).json({ error: 'No document chunks found for analysis' });
    }

    // Create documentContent ONCE for all items
    const documentContent = allChunks.map((chunk, i) => 
      `[Excerpt ${i + 1}${chunk.page ? ` - Page ${chunk.page}` : ''}]\n${chunk.content}`
    ).join('\n\n');

    console.log(`Using ${allChunks.length} chunks for analysis (${documentContent.length} chars)`);

    const results = [];
    let processedCount = 0;

    // Process each item with the same documentContent
    for (const item of items) {
      try {
        // Analyze with GPT-4 using all chunks
        const analysis = await analyzeItemWithContent(item, documentContent, checkData.checker_templates.type);

        // Save result to database
        const { data: resultData, error: resultError } = await serviceClient
          .from('check_results')
          .insert({
            check_id: actualCheckId,
            item_id: item.id,
            status: analysis.status,
            coverage_score: analysis.coverage_score,
            reasoning: analysis.reasoning,
          })
          .select()
          .single();

        if (resultError) {
          throw new Error(`Failed to save result: ${resultError.message}`);
        }

        // Save evidence
        if (analysis.evidence.length > 0) {
          const evidenceData = analysis.evidence.map(evidence => ({
            result_id: resultData.id,
            page: evidence.page,
            url: evidence.url,
            snippet: evidence.snippet,
          }));

          const { error: evidenceError } = await serviceClient
            .from('compliance_evidences')
            .insert(evidenceData);

          if (evidenceError) {
            console.error('Failed to save evidence:', evidenceError);
          }
        }

        results.push({
          item_id: item.id,
          item_name: item.item_name,
          status: analysis.status,
          coverage_score: analysis.coverage_score,
        });

        processedCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`Failed to analyze item ${item.id}:`, error);
        
        // Save error result
        await serviceClient
          .from('check_results')
          .insert({
            check_id: actualCheckId,
            item_id: item.id,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Analysis failed: ${error.message}`,
          });

        results.push({
          item_id: item.id,
          item_name: item.item_name,
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Analysis completed for ${processedCount}/${items.length} items`,
      results: results,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
    });
  }
}