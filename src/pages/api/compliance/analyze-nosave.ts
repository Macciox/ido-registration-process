import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getDocumentChunks } from '@/lib/pdf-processor';
import { renderPrompt } from '@/lib/prompts';
import { getPromptIdForTemplate } from '@/lib/prompt-selector';
import { calculateScore } from '@/lib/scoring-system';
import { filterWhitepaperItems } from '@/lib/whitepaper-filter';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId, whitepaperSection } = req.body;

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

    // Get document (only PDFs, not URLs)
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('mime_type', 'application/pdf')
      .single();

    if (!document) {
      return res.status(404).json({ error: 'PDF document not found' });
    }
    
    console.log('Processing PDF document:', document.filename, 'mime_type:', document.mime_type);

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
    let chunks = await getDocumentChunks(documentId);
    
    // If no chunks exist, try to reprocess the document from storage
    if (chunks.length === 0) {
      console.log('No chunks found, attempting to reprocess document from storage...');
      console.log('Document file_path:', document.file_path);
      
      if (document.file_path) {
        try {
          // Download file from storage
          console.log('Attempting to download from storage bucket: compliance-documents');
          console.log('File path:', document.file_path);
          console.log('Document details:', { id: document.id, filename: document.filename, mime_type: document.mime_type });
          
          // Debug: List files in bucket to see what's available
          const { data: bucketFiles, error: listError } = await serviceClient.storage
            .from('compliance-documents')
            .list('', { limit: 20 });
          
          if (listError) {
            console.error('Error listing bucket files:', listError);
          } else {
            console.log('Files in bucket root:', bucketFiles?.map(f => ({ name: f.name, size: f.metadata?.size })));
          }
          
          // Try to list the specific folder if file_path contains a folder
          const pathParts = document.file_path.split('/');
          if (pathParts.length > 1) {
            const folder = pathParts[0];
            const { data: folderFiles, error: folderError } = await serviceClient.storage
              .from('compliance-documents')
              .list(folder, { limit: 20 });
            
            if (folderError) {
              console.error(`Error listing folder '${folder}':`, folderError);
            } else {
              console.log(`Files in folder '${folder}':`, folderFiles?.map(f => ({ name: f.name, size: f.metadata?.size })));
            }
          }
          
          // Attempt download
          let { data: fileData, error: downloadError } = await serviceClient.storage
            .from('compliance-documents')
            .download(document.file_path);
            
          if (downloadError) {
            console.error('Storage download error:', downloadError);
            console.error('Error type:', downloadError.name);
            console.error('Error message:', downloadError.message);
            console.error('Full error object:', JSON.stringify(downloadError, null, 2));
            
            // Try alternative approaches
            console.log('Trying alternative download methods...');
            
            // Method 1: Try with different path formats
            const alternativePaths = [
              document.file_path,
              document.file_path.replace(/^\//, ''), // Remove leading slash
              `/${document.file_path}`, // Add leading slash
              document.filename // Just the filename
            ];
            
            let downloadSuccess = false;
            for (const altPath of alternativePaths) {
              if (altPath !== document.file_path) {
                console.log(`Trying alternative path: ${altPath}`);
                const { data: altData, error: altError } = await serviceClient.storage
                  .from('compliance-documents')
                  .download(altPath);
                
                if (!altError && altData) {
                  console.log(`Success with alternative path: ${altPath}`);
                  fileData = altData;
                  downloadSuccess = true;
                  break;
                } else if (altError) {
                  console.log(`Alternative path failed: ${altPath} - ${altError.message}`);
                }
              }
            }
            
            if (!downloadSuccess) {
              throw new Error(`Storage download failed: File not found at path '${document.file_path}'. Error: ${downloadError.message || JSON.stringify(downloadError)}`);
            }
          }
          
          if (fileData) {
            console.log('File downloaded from storage, size:', fileData.size);
            const buffer = Buffer.from(await fileData.arrayBuffer());
            
            // Process the PDF to create chunks
            const { processPDFDocument } = await import('@/lib/pdf-processor');
            const result = await processPDFDocument(documentId, buffer);
            
            console.log('Processing result:', result);
            
            if (result.success) {
              // Fetch the newly created chunks
              chunks = await getDocumentChunks(documentId);
              console.log(`Successfully reprocessed document: ${chunks.length} chunks created`);
            } else {
              throw new Error(`PDF processing failed: ${result.message}`);
            }
          } else {
            throw new Error('No file data received from storage');
          }
        } catch (reprocessError: any) {
          console.error('Document reprocessing failed:', reprocessError);
          return res.status(400).json({ 
            error: `Document processing failed: ${reprocessError.message || reprocessError}. Please try re-uploading the document.` 
          });
        }
      } else {
        return res.status(400).json({ 
          error: 'Document has no file path. Please re-upload the document.' 
        });
      }
      
      // Final check - if still no chunks, return error
      if (chunks.length === 0) {
        return res.status(400).json({ 
          error: 'Document could not be processed. Please try re-uploading the document.' 
        });
      }
    }

    // Combine chunks into full document text (limit to avoid token limits)
    const documentText = chunks
      .slice(0, 10) // Use first 10 chunks to stay within token limits
      .map(chunk => chunk.content)
      .join('\n\n');

    // Filter items for whitepaper if section is specified
    let itemsToAnalyze = template.checker_items;
    if (whitepaperSection && template.name?.includes('Whitepaper')) {
      itemsToAnalyze = filterWhitepaperItems(template.checker_items, whitepaperSection);
      console.log(`Filtered whitepaper items: ${itemsToAnalyze.length} items for section ${whitepaperSection}`);
    }

    // Batch GPT-4 analysis with ACTUAL document content
    const results: any[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < itemsToAnalyze.length; i += batchSize) {
      const batch = itemsToAnalyze.slice(i, i + batchSize);
      
      try {
        const requirementsList = batch.map((item: any, idx: number) => 
          `${idx + 1}. Requirement: ${item.item_name}\n   Category: ${item.category}\n   Description: ${item.description}`
        ).join('\n\n');
        
        // Get template-specific prompt
        const promptId = getPromptIdForTemplate(template.name);
        const batchPrompt = await renderPrompt(promptId, {
          requirementsList,
          documentContent: documentText
        });

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
          throw new Error(`GPT API error: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error analyzing batch ${i}-${i + batchSize}:`, error);
        batch.forEach((item: any) => {
          results.push({
            result_id: `temp-${item.id}-${Date.now()}`,
            item_id: item.id,
            item_name: item.item_name,
            category: item.category,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Batch analysis failed: ${error}`,
            manually_overridden: false,
            evidence: []
          });
        });
      }
    }

    // Calculate summary using template-specific scoring
    const summary = calculateScore(results, template.name);

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