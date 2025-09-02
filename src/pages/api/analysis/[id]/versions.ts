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

  const { id: documentId } = req.query;

  try {
    const { data: versions, error } = await serviceClient
      .from('compliance_checks')
      .select(`
        id,
        version,
        overall_score,
        found_items,
        clarification_items,
        missing_items,
        status,
        created_at,
        template_name
      `)
      .eq('document_id', documentId)
      .order('version', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      versions: versions || [],
      count: versions?.length || 0
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch versions',
      details: error.message
    });
  }
}