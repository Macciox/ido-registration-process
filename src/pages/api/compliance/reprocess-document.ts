import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processPDFDocument } from '@/lib/pdf-processor';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID required' });
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

    // Download file from storage
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('compliance-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      return res.status(400).json({ error: 'Failed to download document from storage' });
    }

    // Convert to buffer
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // Update status to processing
    await serviceClient
      .from('compliance_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Process PDF
    const processingResult = await processPDFDocument(documentId, fileBuffer);

    // Update final status
    const status = processingResult.success ? 'completed' : 'failed';
    await serviceClient
      .from('compliance_documents')
      .update({ processing_status: status })
      .eq('id', documentId);

    res.status(200).json({
      success: processingResult.success,
      message: processingResult.message,
      chunksCount: processingResult.chunksCount
    });

  } catch (error: any) {
    console.error('Reprocess error:', error);
    res.status(500).json({ error: 'Reprocessing failed', message: error.message });
  }
}