import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { extractTextFromPdf, extractTextFromUrl, chunkPages, embedChunks, saveChunks } from '@/lib/compliance/ingest';

interface ProcessRequest {
  check_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { check_id }: ProcessRequest = req.body;

  if (!check_id) {
    return res.status(400).json({ error: 'check_id is required' });
  }

  try {
    // Get check details
    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('id', check_id)
      .single();

    if (checkError || !checkData) {
      throw new Error('Check not found');
    }

    // Update status to processing
    await supabase
      .from('compliance_checks')
      .update({ status: 'processing' })
      .eq('id', check_id);

    let pages: any[] = [];

    if (checkData.input_type === 'pdf') {
      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('compliance-documents')
        .download(checkData.document_path);

      if (downloadError) {
        throw new Error(`Failed to download PDF: ${downloadError.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      pages = await extractTextFromPdf(buffer);

    } else if (checkData.input_type === 'url') {
      const text = await extractTextFromUrl(checkData.document_url);
      pages = [{ page: 1, text }];
    }

    if (pages.length === 0) {
      throw new Error('No text extracted from document');
    }

    // Chunk the pages
    const chunks = chunkPages(pages, 1600, 200);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from text');
    }

    // Generate embeddings
    const embeddings = await embedChunks(chunks);

    // Save chunks to database
    await saveChunks(check_id, chunks, embeddings);

    // Update status to ready
    await supabase
      .from('compliance_checks')
      .update({ status: 'ready' })
      .eq('id', check_id);

    res.status(200).json({
      success: true,
      message: 'Processing completed successfully',
      chunks_count: chunks.length,
    });

  } catch (error: any) {
    console.error('Processing error:', error);

    // Update status to error
    await supabase
      .from('compliance_checks')
      .update({ 
        status: 'error',
        error_text: error.message 
      })
      .eq('id', check_id);

    res.status(500).json({
      error: 'Processing failed',
      message: error.message,
    });
  }
}