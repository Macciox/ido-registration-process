import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ingestDocument } from '@/lib/compliance/ingestion';

interface ProcessRequest {
  checkId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { checkId }: ProcessRequest = req.body;

    if (!checkId) {
      return res.status(400).json({ error: 'checkId is required' });
    }

    // Get check data
    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('id', checkId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !checkData) {
      return res.status(404).json({ error: 'Check not found' });
    }

    if (checkData.status !== 'uploaded') {
      return res.status(400).json({ error: 'Check is not in uploaded status' });
    }

    // Update status to processing
    await supabase
      .from('compliance_checks')
      .update({ status: 'processing' })
      .eq('id', checkId);

    try {
      // Process the document
      await ingestDocument(checkId, checkData.document_path, checkData.input_type);

      // Update status to ready
      await supabase
        .from('compliance_checks')
        .update({ status: 'ready' })
        .eq('id', checkId);

      res.status(200).json({
        success: true,
        message: 'Document processed successfully',
        checkId: checkId
      });

    } catch (error: any) {
      // Update status to error
      await supabase
        .from('compliance_checks')
        .update({ 
          status: 'error',
          error_text: error.message 
        })
        .eq('id', checkId);

      throw error;
    }

  } catch (error: any) {
    console.error('Process error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
}