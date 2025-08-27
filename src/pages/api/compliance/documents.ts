import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: documents, error } = await supabase
      .from('compliance_documents')
      .select(`
        id,
        filename,
        file_path,
        created_at,
        compliance_checks (
          id,
          template_id,
          status,
          created_at,
          compliance_templates (
            name,
            type
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}