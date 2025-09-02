import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processWebpage } from '@/lib/web-scraper';
import { processCrawledWebsite } from '@/lib/web-crawler';
import { getDocumentChunks } from '@/lib/pdf-processor';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, templateId, batchSize = 1 } = req.body; // Force 1 for debugging

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

    // Process website: try crawler first, fallback to single page
    console.log('Crawling website:', url);
    let processingResult = await processCrawledWebsite(document.id, url, 25); // Max 25 pages
    
    // Fallback to single page if crawler fails
    if (!processingResult.success) {
      console.log('Crawler failed, falling back to single page scraping');
      const singlePageResult = await processWebpage(document.id, url);
      processingResult = {
        ...singlePageResult,
        pagesCount: 1 // Add missing property for single page
      };
    }
    
    if (!processingResult.success) {
      return res.status(400).json({ 
        error: 'Failed to process webpage',
        details: processingResult.message,
        debug: { crawlerAttempted: true, fallbackAttempted: true }
      });
    }
    
    console.log('Processing result:', {
      success: processingResult.success,
      chunksCount: processingResult.chunksCount,
      pagesCount: processingResult.pagesCount || 1,
      totalWords: processingResult.totalWords
    });

    // Get document chunks for analysis
    const chunks = await getDocumentChunks(document.id);
    
    // Batch analyze with GPT-4 (configurable batch size)
    const results: any[] = [];
    
    for (let i = 0; i < template.checker_items.length; i += batchSize) {
      const batch = template.checker_items.slice(i, i + batchSize);
      
      try {
        // Use limited document content to stay within token limits
        const batchContent = chunks.slice(0, 5).map(chunk => chunk.content).join('\n\n').substring(0, 15000); // Max 15k chars
        
        if (batchContent.length < 100) {
          console.log('❌ Content too short:', batchContent.length, 'chars');
          throw new Error('Document content too short for analysis');
        }
        
        // Create batch prompt
        const requirementsList = batch.map((item: any, idx: number) => 
          `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description}`
        ).join('\n\n');
        
        const batchPrompt = `You are a MiCA regulation compliance expert. Analyze if these specific requirements are met in the provided document.

REQUIREMENTS TO ANALYZE:
${requirementsList}

DOCUMENT CONTENT:
${batchContent}

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

        console.log(`\n=== GPT REQUEST DEBUG ===`);
        console.log(`Batch ${i + 1}: ${batch.length} items`);
        console.log(`Content length: ${batchContent.length} chars`);
        console.log(`Chunks available: ${chunks.length}`);
        console.log(`First 200 chars: ${batchContent.substring(0, 200)}...`);
        console.log(`Requirements: ${batch.map((item: any) => item.item_name).join(', ')}`);
        console.log(`OpenAI API Key exists: ${!!process.env.OPENAI_API_KEY}`);
        console.log(`API Key length: ${process.env.OPENAI_API_KEY?.length || 0}`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: batchPrompt }],
            temperature: 0.1,
            max_tokens: 1000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          
          console.log(`\n=== GPT RESPONSE DEBUG ===`);
          console.log(`Response length: ${content?.length || 0} chars`);
          console.log(`Raw response: ${content?.substring(0, 500)}...`);
          
          const jsonMatch = content?.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            console.log(`JSON found: ${jsonMatch[0].substring(0, 200)}...`);
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`Parsed ${parsed.length} results`);
            
            // Map batch results back to individual items
            parsed.forEach((result: any, idx: number) => {
              const item = batch[idx];
              if (item) {
                console.log(`Item ${idx + 1}: ${item.item_name} -> ${result.status} (${result.coverage_score}%)`);
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
            console.log('❌ No JSON array found in response!');
            console.log('Full response:', content);
            throw new Error('No JSON array in response');
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ GPT API error ${response.status}: ${errorText}`);
          console.log('Request headers:', response.headers);
          throw new Error(`GPT API error: ${response.status} - ${errorText}`);
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
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < template.checker_items.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
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
      processing: {
        ...processingResult,
        url: url,
        hostname: new URL(url).hostname
      },
      debug: debugInfo,
      note: 'Batch web content analysis with debug info'
    });

  } catch (error: any) {
    console.error('URL analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}