import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Documents endpoint called');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      console.log('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.log('User authenticated:', user.id);

    const { data: documents, error } = await serviceClient
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log('Found documents:', documents?.length || 0);
    res.status(200).json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}