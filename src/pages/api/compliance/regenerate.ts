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

  const { documentId, templateId, nonFoundItems } = req.body;

  if (!documentId || !templateId || !nonFoundItems) {
    return res.status(400).json({ error: 'documentId, templateId, and nonFoundItems required' });
  }

  try {
    console.log(`\n=== REGENERATING NON-FOUND ITEMS ===`);
    console.log(`Document: ${documentId}`);
    console.log(`Template: ${templateId}`);
    console.log(`Items to regenerate: ${nonFoundItems.length}`);
    
    // Get document chunks
    const chunks = await getDocumentChunks(documentId);
    
    if (!chunks || chunks.length === 0) {
      throw new Error('No document chunks found');
    }
    
    // Use more content for regeneration
    const fullContent = chunks.slice(0, 15).map(chunk => chunk.content).join('\n\n').substring(0, 25000);
    
    if (fullContent.length < 100) {
      throw new Error('Document content too short for regeneration');
    }
    
    // Create regeneration prompt
    const itemsList = nonFoundItems.map((item: any, idx: number) => 
      `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description || 'No description'}\n   Previous Status: ${item.status} (${item.coverage_score}%)`
    ).join('\n\n');
    
    const regeneratePrompt = `You are a MiCA regulation compliance expert. These requirements were previously marked as NOT FOUND or NEEDS CLARIFICATION. Please re-analyze them more carefully with this expanded document content.

REQUIREMENTS TO RE-ANALYZE:
${itemsList}

EXPANDED DOCUMENT CONTENT:
${fullContent}

For EACH requirement above, search more thoroughly and creatively. Look for:
- Synonyms and related terms
- Indirect references
- Implied information
- Context clues

Be more generous in your scoring if you find ANY relevant information.

Scoring:
- FOUND (80-100): Information clearly present or reasonably implied
- NEEDS_CLARIFICATION (40-79): Some relevant information found
- MISSING (0-39): Absolutely no relevant information

Respond with a JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Detailed explanation of what you found or why it's still missing",
    "evidence_snippets": ["exact text from document that supports this requirement"]
  }
]`;

    console.log(`Regeneration prompt length: ${regeneratePrompt.length} chars`);
    console.log(`Content length: ${fullContent.length} chars`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: regeneratePrompt }],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    const jsonMatch = content?.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array found in GPT response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Map results back to items with IDs
    const updatedResults = parsed.map((result: any, idx: number) => {
      const originalItem = nonFoundItems[idx];
      return {
        item_id: originalItem.item_id,
        item_name: originalItem.item_name,
        category: originalItem.category,
        status: result.status,
        coverage_score: result.coverage_score,
        reasoning: result.reasoning,
        evidence: (result.evidence_snippets || []).map((snippet: string) => ({ snippet }))
      };
    });
    
    const improvedCount = updatedResults.filter((item: any) => item.status === 'FOUND').length;
    const originalFoundCount = nonFoundItems.filter((item: any) => item.status === 'FOUND').length;
    const newlyFound = improvedCount - originalFoundCount;
    
    console.log(`Regeneration completed:`);
    console.log(`- Items processed: ${updatedResults.length}`);
    console.log(`- Newly found: ${newlyFound}`);
    console.log(`- Total now found: ${improvedCount}`);
    
    res.status(200).json({
      success: true,
      message: `Regenerated ${updatedResults.length} items. ${newlyFound} newly found.`,
      updatedResults: updatedResults,
      stats: {
        processed: updatedResults.length,
        newlyFound: newlyFound,
        totalFound: improvedCount
      }
    });

  } catch (error: any) {
    console.error('Regenerate error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Regeneration failed', 
      message: error.message 
    });
  }
}