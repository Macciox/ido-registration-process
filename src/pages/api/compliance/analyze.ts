import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { retrieveWithExpansion } from '@/lib/compliance/retrieval';
import { Result, ResultType } from '@/lib/compliance/schema';
import { getPromptForTemplate, formatPrompt, COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';

interface AnalyzeRequest {
  check_id: string;
}



async function analyzeItem(
  item: any,
  excerpts: any[],
  templateType: string,
  retries: number = 2
): Promise<ResultType> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const relevantContent = excerpts.map((excerpt, i) => 
    `[Excerpt ${i + 1}${excerpt.page ? ` - Page ${excerpt.page}` : ''}]\n${excerpt.content}`
  ).join('\n\n');

  const promptTemplate = getPromptForTemplate(templateType);
  const userPrompt = formatPrompt(promptTemplate, {
    category: item.category,
    item_name: item.item_name,
    description: item.description,
    relevant_content: relevantContent
  });

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
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { check_id }: AnalyzeRequest = req.body;

    if (!check_id) {
      return res.status(400).json({ error: 'check_id is required' });
    }

    // Verify check belongs to user and is ready
    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .select('*, checker_templates(*)')
      .eq('id', check_id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !checkData) {
      return res.status(404).json({ error: 'Check not found' });
    }

    if (checkData.status !== 'ready') {
      return res.status(400).json({ error: 'Check is not ready for analysis' });
    }

    // Get checklist items for this template
    const { data: items, error: itemsError } = await supabase
      .from('checker_items')
      .select('*')
      .eq('template_id', checkData.template_id)
      .order('sort_order');

    if (itemsError || !items) {
      throw new Error('Failed to load checklist items');
    }

    const results = [];
    let processedCount = 0;

    // Process each item
    for (const item of items) {
      try {
        // Retrieve relevant chunks
        const excerpts = await retrieveWithExpansion(
          check_id,
          item.item_name,
          item.description || '',
          6
        );

        // Analyze with GPT-4
        const analysis = await analyzeItem(item, excerpts, checkData.checker_templates.type);

        // Save result to database
        const { data: resultData, error: resultError } = await supabase
          .from('check_results')
          .insert({
            check_id: check_id,
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

          const { error: evidenceError } = await supabase
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
        await supabase
          .from('check_results')
          .insert({
            check_id: check_id,
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