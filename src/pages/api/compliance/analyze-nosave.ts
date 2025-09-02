import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getDocumentChunks } from '@/lib/pdf-processor';

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

    // Get document chunks
    const chunks = await getDocumentChunks(documentId);
    
    if (chunks.length === 0) {
      return res.status(400).json({ 
        error: 'Document not processed yet. Please upload and process the document first.' 
      });
    }

    // Combine chunks into full document text (limit to avoid token limits)
    const documentText = chunks
      .slice(0, 10) // Use first 10 chunks to stay within token limits
      .map(chunk => chunk.content)
      .join('\n\n');

    // Real GPT-4 analysis with ACTUAL document content
    const results = [];
    
    for (const item of template.checker_items) {
      try {
        const prompt = `You are a MiCA regulation compliance expert. Analyze if this requirement is met in the provided document.

Requirement: ${item.item_name}
Category: ${item.category}
Description: ${item.description}

Document Content:
${documentText}

For this crypto token document, evaluate:
- FOUND (80-100): Clearly present and comprehensive
- NEEDS_CLARIFICATION (40-79): Partially present but incomplete  
- MISSING (0-39): Not present or inadequate

Respond ONLY in JSON format:
{
  "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
  "coverage_score": 0-100,
  "reasoning": "Brief analysis of what was found or missing",
  "evidence_snippets": ["exact quotes from document if found"]
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
            results.push({
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: parsed.status,
              coverage_score: parsed.coverage_score,
              reasoning: parsed.reasoning,
              evidence: (parsed.evidence_snippets || []).map((snippet: string) => ({ snippet }))
            });
          } else {
            throw new Error('No JSON in response');
          }
        } else {
          throw new Error(`GPT API error: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error analyzing ${item.item_name}:`, error);
        results.push({
          item_id: item.id,
          item_name: item.item_name,
          category: item.category,
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
          reasoning: `Analysis failed: ${error}`,
          evidence: []
        });
      }
    }

    // Calculate summary
    const summary = {
      found_items: results.filter((r: any) => r.status === 'FOUND').length,
      clarification_items: results.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length,
      missing_items: results.filter((r: any) => r.status === 'MISSING').length,
      overall_score: Math.round(results.reduce((sum: number, r: any) => sum + r.coverage_score, 0) / results.length)
    };

    res.status(200).json({
      checkId: `temp-${Date.now()}`,
      results,
      summary,
      note: 'Real GPT-4 analysis - NO database saving'
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}