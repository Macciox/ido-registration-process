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

    // Batch GPT-4 analysis with ACTUAL document content
    const results: any[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < template.checker_items.length; i += batchSize) {
      const batch = template.checker_items.slice(i, i + batchSize);
      
      try {
        const requirementsList = batch.map((item: any, idx: number) => 
          `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description}`
        ).join('\n\n');
        
        const batchPrompt = `You are a MiCA regulation compliance expert. Analyze if these specific requirements are met in the provided document.

REQUIREMENTS TO ANALYZE:
${requirementsList}

DOCUMENT CONTENT:
${documentText}

For EACH requirement above, you must:
1. Search the document for relevant information
2. Determine if the requirement is satisfied
3. Provide exact quotes as evidence if found

Scoring:
- FOUND (80-100): Information clearly present with good detail
- NEEDS_CLARIFICATION (40-79): Some information present but incomplete
- MISSING (0-39): No relevant information found

Respond with a JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Explain what you found or why it's missing",
    "evidence_snippets": ["exact text from document that supports this requirement"]
  }
]`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: batchPrompt }],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          const jsonMatch = content?.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            parsed.forEach((result: any, idx: number) => {
              const item = batch[idx];
              if (item) {
                results.push({
                  item_id: item.id,
                  item_name: item.item_name,
                  category: item.category,
                  status: result.status,
                  coverage_score: result.coverage_score,
                  reasoning: result.reasoning,
                  evidence: (result.evidence_snippets || []).map((snippet: string) => ({ snippet }))
                });
              }
            });
          } else {
            throw new Error('No JSON array in response');
          }
        } else {
          throw new Error(`GPT API error: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error analyzing batch ${i}-${i + batchSize}:`, error);
        batch.forEach((item: any) => {
          results.push({
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Batch analysis failed: ${error}`,
            evidence: []
          });
        });
      }
    }

    // Calculate summary with NOT_APPLICABLE support
    const foundItems = results.filter((r: any) => r.status === 'FOUND').length;
    const clarificationItems = results.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length;
    const missingItems = results.filter((r: any) => r.status === 'MISSING').length;
    const notApplicableItems = results.filter((r: any) => r.status === 'NOT_APPLICABLE').length;
    const applicableItems = results.length - notApplicableItems;
    
    // Calculate score based on applicable items only
    const overallScore = applicableItems > 0 
      ? Math.round((foundItems * 100) / applicableItems)
      : 0;
    
    const summary = {
      found_items: foundItems,
      clarification_items: clarificationItems,
      missing_items: missingItems,
      not_applicable_items: notApplicableItems,
      applicable_items: applicableItems,
      overall_score: overallScore
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