import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processWebpage } from '@/lib/web-scraper';
import { processCrawledWebsite } from '@/lib/web-crawler';
import { getDocumentChunks } from '@/lib/pdf-processor';
import { renderPrompt } from '@/lib/prompts';
import { COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';
import { validateUrl, sanitizeForLog } from '@/lib/sanitize';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting for OpenAI (60 RPM for gpt-4o-mini)
const OPENAI_RATE_LIMIT = 60; // requests per minute
const REQUEST_INTERVAL = Math.ceil(60000 / OPENAI_RATE_LIMIT); // ~1000ms between requests

async function processCategory(
  category: string, 
  categoryItems: any[], 
  documentContent: string, 
  templateType: string,
  delay: number = 0
): Promise<any[]> {
  
  // Add delay for rate limiting
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  try {
    console.log(`Processing category: ${category} (${categoryItems.length} items)`);
    
    const requirementsList = categoryItems.map((item: any, idx: number) => 
      `${idx + 1}. Requirement: ${item.item_name}\n   Description: ${item.description}`
    ).join('\n\n');
    
    const promptId = templateType === 'whitepaper' ? 'WHITEPAPER_ANALYSIS' : 
                    templateType === 'legal' ? 'LEGAL_ANALYSIS' : 'WHITEPAPER_ANALYSIS';
    
    const categoryPrompt = await renderPrompt(promptId, {
      requirementsList: `Category: ${category}\n\n${requirementsList}`,
      documentContent: documentContent
    });
    
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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const jsonMatch = content?.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const results: any[] = [];
    
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
    
    console.log(`✅ Completed category: ${category} (${results.length} results)`);
    return results;
    
  } catch (error) {
    console.error(`❌ Failed category: ${category}`, error);
    
    // Return failed results for all items in category
    return categoryItems.map((item: any) => ({
      result_id: `temp-${item.id}-${Date.now()}`,
      item_id: item.id,
      item_name: item.item_name,
      category: item.category,
      status: 'NEEDS_CLARIFICATION',
      coverage_score: 0,
      reasoning: `Category analysis failed: ${error}`,
      manually_overridden: false,
      evidence: []
    }));
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, templateId } = req.body;

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

    // Get or create document
    let { data: document } = await serviceClient
      .from('compliance_documents')
      .select('id, filename')
      .eq('file_path', url)
      .eq('user_id', user.id)
      .eq('mime_type', 'text/html')
      .single();

    if (!document) {
      const { data: newDoc } = await serviceClient
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
      document = newDoc;
    }

    if (!document) {
      return res.status(500).json({ error: 'Failed to create document' });
    }

    // Process website
    let processingResult = await processCrawledWebsite(document.id, url, 50);
    if (!processingResult.success) {
      const singlePageResult = await processWebpage(document.id, url);
      processingResult = { ...singlePageResult, pagesCount: 1 };
    }
    
    if (!processingResult.success) {
      return res.status(400).json({ error: 'Failed to process webpage' });
    }

    // Get document content
    const chunks = await getDocumentChunks(document.id);
    const documentContent = chunks.slice(0, 43).map((chunk, i) => 
      `[Excerpt ${i + 1}]\n${chunk.content}`
    ).join('\n\n');

    // Group items by category
    const itemsByCategory = template.checker_items.reduce((acc: any, item: any) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    const categories = Object.keys(itemsByCategory);
    console.log(`🚀 Starting parallel analysis of ${categories.length} categories`);

    // Process categories in parallel with rate limiting
    const categoryPromises = categories.map((category, index) => 
      processCategory(
        category, 
        itemsByCategory[category], 
        documentContent, 
        template.type,
        index * REQUEST_INTERVAL // Stagger requests
      )
    );

    // Wait for all categories to complete
    const categoryResults = await Promise.all(categoryPromises);
    const allResults = categoryResults.flat();

    // Calculate summary
    const foundItems = allResults.filter(r => r.status === 'FOUND').length;
    const clarificationItems = allResults.filter(r => r.status === 'NEEDS_CLARIFICATION').length;
    const missingItems = allResults.filter(r => r.status === 'MISSING').length;
    const notApplicableItems = allResults.filter(r => r.status === 'NOT_APPLICABLE').length;
    const applicableItems = allResults.length - notApplicableItems;
    const overallScore = applicableItems > 0 ? Math.round((foundItems * 100) / applicableItems) : 0;

    console.log(`✅ Analysis complete: ${allResults.length} items processed`);

    res.status(200).json({
      checkId: `streaming-${Date.now()}`,
      documentId: document.id,
      templateId: templateId,
      results: allResults,
      summary: {
        found_items: foundItems,
        clarification_items: clarificationItems,
        missing_items: missingItems,
        not_applicable_items: notApplicableItems,
        applicable_items: applicableItems,
        overall_score: overallScore
      },
      processing: {
        ...processingResult,
        url: url,
        hostname: new URL(url).hostname,
        categoriesProcessed: categories.length
      },
      note: 'Parallel category analysis completed'
    });

  } catch (error: any) {
    console.error('Streaming analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}