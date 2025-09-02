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
    
    // Smart chunk selection: use more chunks and prioritize relevant content
    const allChunksText = chunks.map(chunk => chunk.content).join('\n\n');
    
    // For each analysis, search for relevant chunks based on keywords
    const getRelevantContent = (requirement: string, description: string) => {
      const keywords = [...requirement.toLowerCase().split(' '), ...description.toLowerCase().split(' ')]
        .filter(word => word.length > 3);
      
      // Find chunks containing relevant keywords
      const relevantChunks = chunks.filter(chunk => 
        keywords.some(keyword => chunk.content.toLowerCase().includes(keyword))
      );
      
      // If we found relevant chunks, use them + first few chunks for context
      if (relevantChunks.length > 0) {
        const contextChunks = chunks.slice(0, 5);
        const combinedChunks = [...contextChunks, ...relevantChunks]
          .filter((chunk, index, arr) => arr.findIndex(c => c.id === chunk.id) === index) // Remove duplicates
          .slice(0, 25); // Limit to 25 chunks max
        return combinedChunks.map(chunk => chunk.content).join('\n\n');
      }
      
      // Fallback: use first 20 chunks
      return chunks.slice(0, 20).map(chunk => chunk.content).join('\n\n');
    };

    // Analyze with GPT-4
    const results = [];
    
    for (const item of template.checker_items) {
      try {
        // Get relevant content for this specific requirement
        const relevantContent = getRelevantContent(item.item_name, item.description);
        
        const prompt = `You are a MiCA regulation compliance expert. Analyze if this requirement is met in the provided web document.

Requirement: ${item.item_name}
Category: ${item.category}
Description: ${item.description}

Web Document Content:
${relevantContent}

For this crypto project documentation, evaluate:
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
      checkId: `web-${Date.now()}`,
      documentId: document.id,
      templateId: templateId,
      results,
      summary,
      processing: processingResult,
      note: 'Real web content analysis'
    });

  } catch (error: any) {
    console.error('URL analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}