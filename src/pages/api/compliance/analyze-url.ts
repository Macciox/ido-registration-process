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

    // Check if document already exists for this URL
    const { data: existingDoc } = await serviceClient
      .from('compliance_documents')
      .select('id, filename')
      .eq('file_path', url)
      .eq('user_id', user.id)
      .eq('mime_type', 'text/html')
      .single();

    let document;
    if (existingDoc) {
      // Reuse existing document
      document = existingDoc;
      console.log('Reusing existing document:', existingDoc.id, 'for URL:', url);
    } else {
      // Create new document record for URL
      const { data: newDoc, error: docError } = await serviceClient
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
      
      document = newDoc;
      console.log('Created new document:', newDoc.id, 'for URL:', url);
    }

    // Process website: try crawler first, fallback to single page
    console.log('Processing website:', url, 'for document:', document.id);
    
    // Always re-crawl to get latest content (even for existing documents)
    let processingResult = await processCrawledWebsite(document.id, url, 50); // Max 50 pages
    
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
    
    // Single call analysis for fast mode (batchSize >= 5) or batch analysis
    const results: any[] = [];
    
    console.log(`\n=== ANALYSIS MODE SELECTION ===`);
    console.log(`BatchSize: ${batchSize}`);
    console.log(`Mode: ${batchSize >= 5 ? 'SINGLE CALL (Fast)' : 'BATCH PROCESSING'}`);
    console.log(`Template items: ${template.checker_items.length}`);
    
    if (batchSize >= 5) {
      // Single call with all requirements
      try {
        const fullContent = chunks.slice(0, 10).map(chunk => chunk.content).join('\n\n').substring(0, 30000);
        
        if (fullContent.length < 100) {
          throw new Error('Document content too short for analysis');
        }
        
        const requirementsList = template.checker_items.map((item: any, idx: number) => 
          `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description}`
        ).join('\n\n');
        
        const singlePrompt = `You are a MiCA regulation compliance expert. Analyze ALL requirements below against the provided document in a single comprehensive analysis.

ALL REQUIREMENTS TO ANALYZE:
${requirementsList}

DOCUMENT CONTENT:
${fullContent}

For EACH requirement (${template.checker_items.length} total), provide analysis in exact order:

Scoring:
- FOUND (80-100): Information clearly present with good detail
- NEEDS_CLARIFICATION (40-79): Some information present but incomplete  
- MISSING (0-39): No relevant information found

Respond with a JSON array containing exactly ${template.checker_items.length} objects in the same order as requirements:
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Explain what you found or why it's missing",
    "evidence_snippets": ["exact text from document that supports this requirement"]
  }
]`;

        console.log(`\n=== SINGLE CALL GPT REQUEST ===`);
        console.log(`Total requirements: ${template.checker_items.length}`);
        console.log(`Content length: ${fullContent.length} chars`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: singlePrompt }],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          
          const jsonMatch = content?.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            parsed.forEach((result: any, idx: number) => {
              const item = template.checker_items[idx];
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
          const errorText = await response.text();
          throw new Error(`GPT API error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error('Single call analysis failed:', error);
        // Fallback to batch processing
        template.checker_items.forEach((item: any) => {
          results.push({
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Single call analysis failed: ${error}`,
            evidence: []
          });
        });
      }
    } else {
      // Original batch processing for smaller batch sizes
      for (let i = 0; i < template.checker_items.length; i += batchSize) {
        const batch = template.checker_items.slice(i, i + batchSize);
        
        try {
          const batchContent = chunks.slice(0, 5).map(chunk => chunk.content).join('\n\n').substring(0, 15000);
          
          if (batchContent.length < 100) {
            throw new Error('Document content too short for analysis');
          }
          
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
            const errorText = await response.text();
            throw new Error(`GPT API error: ${response.status} - ${errorText}`);
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
        
        if (i + batchSize < template.checker_items.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
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