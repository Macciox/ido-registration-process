import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { ingestDocument } from '@/lib/compliance/ingest';
import { retrieveWithExpansion } from '@/lib/compliance/retrieval';
import { getPromptForTemplate, formatPrompt } from '@/lib/compliance/prompts';
import { Result } from '@/lib/compliance/schema';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeWithGPT(prompt: string, maxRetries = 2): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) throw new Error('No content in response');
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate with schema
      const result = Result.parse({
        status: parsed.status,
        coverage_score: parsed.coverage_score,
        reasoning: parsed.reasoning,
        evidence: (parsed.evidence_snippets || []).map((snippet: string) => ({ snippet }))
      });
      
      return result;
    } catch (error) {
      console.error(`GPT analysis attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) {
        return {
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
          reasoning: `Analysis failed after ${maxRetries + 1} attempts: ${error}`,
          evidence: []
        };
      }
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId } = req.body;

  if (!documentId || !templateId) {
    return res.status(400).json({ error: 'Document ID and template ID required' });
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

    // Get document and template
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { data: template } = await serviceClient
      .from('checker_templates')
      .select(`
        *,
        checker_items (*)
      `)
      .eq('id', templateId)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create or get compliance check
    const { data: checkData, error: checkError } = await serviceClient
      .from('compliance_checks')
      .upsert({
        document_id: documentId,
        template_id: templateId,
        status: 'processing'
      }, {
        onConflict: 'document_id,template_id'
      })
      .select()
      .single();

    if (checkError) {
      return res.status(500).json({ error: 'Failed to create check', message: checkError.message });
    }

    // Ingest document if not already done
    await ingestDocument(document.file_path, checkData.id);

    const results = [];
    const prompt = getPromptForTemplate(template.type);

    // Process each checker item
    for (const item of template.checker_items) {
      try {
        // Retrieve relevant content
        const chunks = await retrieveWithExpansion(
          checkData.id,
          item.item_name,
          item.description,
          6
        );

        const relevantContent = chunks.map(c => c.content).join('\n\n');
        
        // Format prompt
        const formattedPrompt = formatPrompt(prompt, {
          category: item.category,
          item_name: item.item_name,
          description: item.description,
          relevant_content: relevantContent
        });

        // Analyze with GPT
        const analysis = await analyzeWithGPT(formattedPrompt);

        // Save result
        const { data: resultData } = await serviceClient
          .from('check_results')
          .upsert({
            check_id: checkData.id,
            item_id: item.id,
            status: analysis.status,
            coverage_score: analysis.coverage_score,
            reasoning: analysis.reasoning
          }, {
            onConflict: 'check_id,item_id'
          })
          .select()
          .single();

        // Save evidence
        if (analysis.evidence?.length > 0) {
          for (const evidence of analysis.evidence) {
            const relevantChunk = chunks.find(c => c.content.includes(evidence.snippet.substring(0, 50)));
            await serviceClient
              .from('compliance_evidences')
              .upsert({
                result_id: resultData.id,
                page: relevantChunk?.page,
                snippet: evidence.snippet,
                start_pos: relevantChunk?.start_pos,
                end_pos: relevantChunk?.end_pos
              });
          }
        }

        results.push({
          item_id: item.id,
          item_name: item.item_name,
          category: item.category,
          status: analysis.status,
          coverage_score: analysis.coverage_score,
          reasoning: analysis.reasoning,
          evidence: analysis.evidence
        });
      } catch (error) {
        console.error(`Error processing item ${item.item_name}:`, error);
        results.push({
          item_id: item.id,
          item_name: item.item_name,
          category: item.category,
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
          reasoning: `Processing error: ${error}`,
          evidence: []
        });
      }
    }

    // Update check status
    await serviceClient
      .from('compliance_checks')
      .update({ status: 'ready' })
      .eq('id', checkData.id);

    // Calculate summary
    const summary = {
      found_items: results.filter(r => r.status === 'FOUND').length,
      clarification_items: results.filter(r => r.status === 'NEEDS_CLARIFICATION').length,
      missing_items: results.filter(r => r.status === 'MISSING').length,
      overall_score: Math.round(results.reduce((sum, r) => sum + r.coverage_score, 0) / results.length)
    };

    res.status(200).json({
      checkId: checkData.id,
      results,
      summary
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}