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

  try {
    const { documentId } = req.query;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID required' });
    }

    // Get document info
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('filename, processing_status')
      .eq('id', documentId)
      .single();

    // Get chunks
    const { data: chunks } = await serviceClient
      .from('compliance_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('page');

    res.status(200).json({
      document,
      totalChunks: chunks?.length || 0,
      chunks: chunks || []
    });

  } catch (error: any) {
    console.error('Debug chunks error:', error);
    res.status(500).json({ error: 'Failed to fetch chunks' });
  }
}