import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processWebpage } from '@/lib/web-scraper';
import { processCrawledWebsite } from '@/lib/web-crawler';
import { getDocumentChunks } from '@/lib/pdf-processor';
import { filterWhitepaperItems } from '@/lib/whitepaper-filter';
import { renderPrompt } from '@/lib/prompts';
import { COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';
import { validateUrl, sanitizeForLog } from '@/lib/sanitize';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, templateId, mode = 'normal', whitepaperSection } = req.body;

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

    // Security validation
    if (!validateUrl(url)) {
      return res.status(400).json({ error: 'URL not allowed for security reasons' });
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
      console.log('Reusing existing document:', existingDoc.id, 'for URL:', sanitizeForLog(url));
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
      console.log('Created new document:', newDoc.id, 'for URL:', sanitizeForLog(url));
    }

    // Process website: try crawler first, fallback to single page
    console.log('Processing website:', sanitizeForLog(url), 'for document:', document.id);
    
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
    
    // Create documentContent ONCE for all items (limit for stability)
    const maxChunks = 43; // Use all available chunks for complete analysis
    const documentContent = chunks.slice(0, maxChunks).map((chunk, i) => 
      `[Excerpt ${i + 1}]\n${chunk.content}`
    ).join('\n\n');
    
    console.log(`Using ${Math.min(maxChunks, chunks.length)} chunks for analysis (${documentContent.length} chars)`);
    
    // Filter items for whitepaper if section is specified
    let itemsToAnalyze = template.checker_items;
    if (whitepaperSection && template.name?.includes('Whitepaper')) {
      itemsToAnalyze = filterWhitepaperItems(template.checker_items, whitepaperSection);
      console.log(`Filtered whitepaper items: ${itemsToAnalyze.length} items for section ${whitepaperSection}`);
    }

    // Analysis modes: fast (1 call) or normal (1 call per item)
    const results: any[] = [];
    
    console.log(`\n=== ANALYSIS MODE SELECTION ===`);
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log(`Template items: ${itemsToAnalyze.length}`);
    
    if (mode === 'fast') {
      // Single call with all requirements
      try {
        if (documentContent.length < 100) {
          throw new Error('Document content too short for analysis');
        }
        
        const requirementsList = itemsToAnalyze.map((item: any, idx: number) => 
          `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description}`
        ).join('\n\n');
        
        // Use centralized prompt system with SAME documentContent
        const promptId = template.type === 'whitepaper' ? 'WHITEPAPER_ANALYSIS' : 
                        template.type === 'legal' ? 'LEGAL_ANALYSIS' : 'WHITEPAPER_ANALYSIS';
        
        const singlePrompt = await renderPrompt(promptId, {
          requirementsList: requirementsList,
          documentContent: documentContent
        });

        console.log(`\n=== SINGLE CALL GPT REQUEST ===`);
        console.log(`Total requirements: ${itemsToAnalyze.length}`);
        console.log(`Content length: ${documentContent.length} chars`);
        console.log('\n=== FAST MODE PROMPT SENT TO OPENAI ===');
        console.log(singlePrompt.substring(0, 3000) + '...');
        console.log('=== END FAST MODE PROMPT ===\n');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: COMPLIANCE_PROMPTS.SYSTEM_PROMPT },
              { role: 'user', content: singlePrompt }
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          
          console.log('\n=== OPENAI RESPONSE DEBUG ===');
          console.log('Full response content:', content);
          console.log('Content length:', content?.length);
          
          const jsonMatch = content?.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            console.log('JSON match found:', jsonMatch[0].substring(0, 500) + '...');
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('Parsed results count:', parsed.length);
            
            parsed.forEach((result: any, idx: number) => {
              const item = itemsToAnalyze[idx];
              if (item) {
                results.push({
                  result_id: `temp-${item.id}-${Date.now()}`,
                  item_id: item.id,
                  item_name: item.item_name,
                  category: item.category,
                  status: result.status,
                  coverage_score: result.coverage_score,
                  reasoning: result.reasoning,
                  manually_overridden: false,
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
        itemsToAnalyze.forEach((item: any) => {
          results.push({
            result_id: `temp-${item.id}-${Date.now()}`,
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Single call analysis failed: ${error}`,
            manually_overridden: false,
            evidence: []
          });
        });
      }
    } else {
      // Batch mode: Group by category and process each category in one call
      console.log(`\n=== BATCH MODE: 1 CALL PER CATEGORY ===`);
      console.log(`About to start processing ${itemsToAnalyze.length} items`);
      console.log(`Document content length: ${documentContent.length} chars`);
      console.log(`Template type: ${template.type}`);
      
      // Group items by category
      const itemsByCategory = itemsToAnalyze.reduce((acc: any, item: any) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {});
      
      const categories = Object.keys(itemsByCategory);
      console.log(`Found ${categories.length} categories:`, categories.map(cat => `${cat} (${itemsByCategory[cat].length} items)`));
      
      try {
        console.log('Starting category processing...');
        const startTime = Date.now();
        const maxProcessingTime = 420000; // 420 seconds
      
      for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
        const category = categories[categoryIndex];
        // Check timeout before processing each category
        const elapsed = Date.now() - startTime;
        if (elapsed > maxProcessingTime) {
          console.log(`\n=== TIMEOUT PROTECTION TRIGGERED ===`);
          console.log(`Processed ${categoryIndex}/${categories.length} categories in ${elapsed}ms`);
          console.log('Stopping to avoid Vercel timeout');
          
          // Add remaining categories as NEEDS_CLARIFICATION
          for (let i = categoryIndex; i < categories.length; i++) {
            const remainingCategory = categories[i];
            const remainingItems = itemsByCategory[remainingCategory];
            remainingItems.forEach((item: any) => {
              results.push({
                result_id: `temp-${item.id}-${Date.now()}`,
                item_id: item.id,
                item_name: item.item_name,
                category: item.category,
                status: 'NEEDS_CLARIFICATION',
                coverage_score: 0,
                reasoning: 'Analysis stopped due to timeout protection',
                manually_overridden: false,
                evidence: []
              });
            });
          }
          break;
        }
        
        const categoryItems = itemsByCategory[category];
        
        try {
          console.log(`\n=== PROCESSING CATEGORY ${categoryIndex + 1}/${categories.length} ===`);
          console.log(`Category: ${category}`);
          console.log(`Items in category: ${categoryItems.length}`);
          console.log(`Elapsed time: ${elapsed}ms`);
          
          if (documentContent.length < 100) {
            throw new Error('Document content too short for analysis');
          }
          
          // Create requirements list for this category
          const requirementsList = categoryItems.map((item: any, idx: number) => 
            `${idx + 1}. Requirement: ${item.item_name}\n   Description: ${item.description}`
          ).join('\n\n');
          
          // Use centralized prompt system
          const promptId = template.type === 'whitepaper' ? 'WHITEPAPER_ANALYSIS' : 
                          template.type === 'legal' ? 'LEGAL_ANALYSIS' : 'WHITEPAPER_ANALYSIS';
          
          console.log(`Using prompt: ${promptId}`);
          console.log('About to render prompt...');
          
          const categoryPrompt = await renderPrompt(promptId, {
            requirementsList: `Category: ${category}\n\n${requirementsList}`,
            documentContent: documentContent
          });
          
          console.log('Prompt rendered successfully');

          console.log(`Sending request to OpenAI for category: ${category}`);
          console.log(`Prompt length: ${categoryPrompt.length} chars`);
          console.log('\n=== PROMPT SENT TO OPENAI ===');
          console.log(categoryPrompt.substring(0, 2000) + '...');
          console.log('=== END PROMPT ===\n');
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: COMPLIANCE_PROMPTS.SYSTEM_PROMPT },
                { role: 'user', content: categoryPrompt }
              ],
              temperature: 0.1,
              max_tokens: 4000, // Increased for multiple items
            }),
          });

          console.log(`OpenAI response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            
            console.log(`OpenAI response received for category ${category}`);
            console.log(`Response length: ${content?.length} chars`);
            console.log(`Raw response content:`, content?.substring(0, 500) + '...');
            
            try {
              const jsonMatch = content?.match(/\[[\s\S]*\]/);
              
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log(`JSON parsed successfully for category ${category}`);
                console.log(`Parsed results count: ${parsed.length}`);
                
                // Map results to items
                parsed.forEach((result: any, idx: number) => {
                  const item = categoryItems[idx];
                  if (item) {
                    results.push({
                      result_id: `temp-${item.id}-${Date.now()}`,
                      item_id: item.id,
                      item_name: item.item_name,
                      category: item.category,
                      status: result.status,
                      coverage_score: result.coverage_score,
                      reasoning: result.reasoning,
                      manually_overridden: false,
                      evidence: (result.evidence_snippets || []).map((snippet: string) => ({ snippet }))
                    });
                  }
                });
                
                console.log(`Successfully added ${parsed.length} results for category ${category}`);
              } else {
                throw new Error('No JSON array in response');
              }
            } catch (parseError) {
              console.error(`JSON parse error for category ${category}:`, parseError);
              console.error(`Content that failed to parse:`, content);
              throw parseError;
            }
          } else {
            const errorText = await response.text();
            throw new Error(`GPT API error: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.error(`\n=== ERROR PROCESSING CATEGORY ${categoryIndex + 1} ===`);
          console.error(`Category: ${category}`);
          console.error(`Error:`, error);
          console.error(`Stack:`, error instanceof Error ? error.stack : 'No stack trace');
          
          // Add all items in this category as failed
          categoryItems.forEach((item: any) => {
            results.push({
              result_id: `temp-${item.id}-${Date.now()}`,
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: 'NEEDS_CLARIFICATION',
              coverage_score: 0,
              reasoning: `Category analysis failed: ${error}`,
              manually_overridden: false,
              evidence: []
            });
          });
        }
        
        // Rate limiting between categories
        console.log(`Waiting 1000ms before next category...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Ready to process next category (${categoryIndex + 2}/${categories.length})`);
      }
      
        console.log(`\n=== BATCH MODE COMPLETED ===`);
        console.log(`Processed ${categories.length} categories with ${results.length} items total`);
        console.log(`Total processing time: ${Date.now() - startTime}ms`);
      } catch (fatalError) {
        console.error(`\n=== FATAL ERROR IN BATCH MODE ===`);
        console.error('Fatal error:', fatalError);
        console.error('Stack:', fatalError instanceof Error ? fatalError.stack : 'No stack trace');
        
        // Add remaining items as failed if we haven't processed them yet
        const processedItems = results.length;
        for (let i = processedItems; i < itemsToAnalyze.length; i++) {
          const item = itemsToAnalyze[i];
          results.push({
            result_id: `temp-${item.id}-${Date.now()}`,
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Fatal error during processing: ${fatalError}`,
            manually_overridden: false,
            evidence: []
          });
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
      chunksUsed: Math.min(maxChunks, chunks.length),
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