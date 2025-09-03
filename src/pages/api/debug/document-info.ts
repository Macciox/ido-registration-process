import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId } = req.query;

  try {
    // Get document info
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    // Get chunks info
    const { data: chunks } = await serviceClient
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId);

    // Check storage
    let storageInfo = null;
    if (document?.file_path) {
      try {
        const { data: fileData, error: storageError } = await serviceClient.storage
          .from('compliance-documents')
          .download(document.file_path);
        
        storageInfo = {
          exists: !storageError,
          error: storageError?.message,
          size: fileData ? fileData.size : 0
        };
      } catch (e: any) {
        storageInfo = { exists: false, error: e.message || e };
      }
    }

    res.status(200).json({
      document,
      chunks: chunks?.length || 0,
      chunksData: chunks,
      storageInfo
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}