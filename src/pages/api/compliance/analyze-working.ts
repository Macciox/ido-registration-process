import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Get document
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get template
    const { data: template } = await serviceClient
      .from('checker_templates')
      .select('*, checker_items(*)')
      .eq('id', templateId)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create compliance check (simplified)
    const { data: checkData } = await serviceClient
      .from('compliance_checks')
      .insert({
        document_id: documentId,
        template_id: templateId,
        status: 'processing'
      })
      .select()
      .single();

    // Process items with real GPT-4 (first 3 only for testing)
    const results = [];
    
    for (const item of template.checker_items.slice(0, 3)) {
      try {
        const prompt = `Analyze this MiCA compliance requirement:

Requirement: ${item.item_name}
Category: ${item.category}
Description: ${item.description}

For a crypto token document, evaluate if this requirement is met.

Respond ONLY in JSON format:
{
  "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
  "coverage_score": 0-100,
  "reasoning": "Brief analysis",
  "evidence_snippets": ["relevant text if found"]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Save to database
            const { data: resultData } = await serviceClient
              .from('check_results')
              .insert({
                check_id: checkData.id,
                item_id: item.id,
                status: parsed.status,
                coverage_score: parsed.coverage_score,
                reasoning: parsed.reasoning
              })
              .select()
              .single();

            results.push({
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: parsed.status,
              coverage_score: parsed.coverage_score,
              reasoning: parsed.reasoning,
              evidence: (parsed.evidence_snippets || []).map((snippet: string) => ({ snippet }))
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${item.item_name}:`, error);
      }
    }

    // Update check status
    await serviceClient
      .from('compliance_checks')
      .update({ status: 'completed' })
      .eq('id', checkData.id);

    const summary = {
      found_items: results.filter((r: any) => r.status === 'FOUND').length,
      clarification_items: results.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length,
      missing_items: results.filter((r: any) => r.status === 'MISSING').length,
      overall_score: Math.round(results.reduce((sum: number, r: any) => sum + r.coverage_score, 0) / results.length)
    };

    res.status(200).json({
      checkId: checkData.id,
      results,
      summary,
      note: 'Working version - first 3 items with GPT-4'
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}