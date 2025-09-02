import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processWebpage } from '@/lib/web-scraper';
import { getDocumentChunks } from '@/lib/pdf-processor';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, templateId, batchSize = 5 } = req.body;

  if (!url || !templateId) {
    return res.status(400).json({ error: 'URL and template ID required' });
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

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
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

    // Create document record for URL
    const { data: document, error: docError } = await serviceClient
      .from('compliance_documents')
      .insert({
        user_id: user.id,
        filename: `Web Analysis: ${new URL(url).hostname}`,
        file_path: url,
        mime_type: 'text/html',
        file_size: 0
      })
      .select()
      .single();

    if (docError) {
      return res.status(500).json({ error: 'Failed to create document record' });
    }

    // Process webpage: scrape and chunk content
    console.log('Processing webpage:', url);
    const processingResult = await processWebpage(document.id, url);
    
    if (!processingResult.success) {
      return res.status(400).json({ 
        error: 'Failed to process webpage',
        details: processingResult.message 
      });
    }

    // Get document chunks for analysis
    const chunks = await getDocumentChunks(document.id);
    
    // Batch analyze with GPT-4 (configurable batch size)
    const results: any[] = [];
    
    for (let i = 0; i < template.checker_items.length; i += batchSize) {
      const batch = template.checker_items.slice(i, i + batchSize);
      
      try {
        // Get content for the batch (use more chunks and search for relevant content)
        const addressKeywords = ['address', 'headquartered', 'registered', 'location', 'beachmont', 'kingstown'];
        const relevantChunks = chunks.filter(chunk => 
          addressKeywords.some(keyword => chunk.content.toLowerCase().includes(keyword))
        );
        
        // Use relevant chunks + first 30 chunks for comprehensive coverage
        const chunksToUse = [...chunks.slice(0, 30), ...relevantChunks]
          .filter((chunk, index, arr) => arr.findIndex(c => c.id === chunk.id) === index)
          .slice(0, 40);
          
        const batchContent = chunksToUse.map(chunk => chunk.content).join('\n\n');
        
        // Create batch prompt
        const requirementsList = batch.map((item: any, idx: number) => 
          `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description}`
        ).join('\n\n');
        
        const batchPrompt = `You are a MiCA regulation compliance expert. Analyze if these requirements are met in the provided web document.

Requirements to analyze:
${requirementsList}

Web Document Content:
${batchContent}

For each requirement, evaluate:
- FOUND (80-100): Clearly present and comprehensive
- NEEDS_CLARIFICATION (40-79): Partially present but incomplete  
- MISSING (0-39): Not present or inadequate

Respond ONLY with a JSON array (one object per requirement in order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Brief analysis of what was found or missing",
    "evidence_snippets": ["exact quotes from document if found"]
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
            
            // Map batch results back to individual items
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
        // Add failed results for this batch
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

    // Calculate summary
    const summary = {
      found_items: results.filter((r: any) => r.status === 'FOUND').length,
      clarification_items: results.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length,
      missing_items: results.filter((r: any) => r.status === 'MISSING').length,
      overall_score: Math.round(results.reduce((sum: number, r: any) => sum + r.coverage_score, 0) / results.length)
    };

    // Debug info: show what content was analyzed
    const debugInfo = {
      totalChunks: chunks.length,
      chunksUsed: Math.min(20, chunks.length),
      firstChunkPreview: chunks[0]?.content.substring(0, 200) + '...',
      lastChunkPreview: chunks[Math.min(19, chunks.length - 1)]?.content.substring(0, 200) + '...',
      searchTerms: ['address', 'headquartered', 'registered', 'location', 'beachmont', 'kingstown']
    };

    res.status(200).json({
      checkId: `web-${Date.now()}`,
      documentId: document.id,
      templateId: templateId,
      results,
      summary,
      processing: processingResult,
      debug: debugInfo,
      note: 'Batch web content analysis with debug info'
    });

  } catch (error: any) {
    console.error('URL analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}