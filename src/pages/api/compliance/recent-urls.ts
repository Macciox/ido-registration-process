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
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: recentUrls, error } = await serviceClient
      .from('compliance_documents')
      .select('id, filename, file_path, created_at')
      .eq('user_id', user.id)
      .eq('mime_type', 'text/html')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    res.status(200).json({ recentUrls });
  } catch (error) {
    console.error('Error fetching recent URLs:', error);
    res.status(500).json({ error: 'Failed to fetch recent URLs' });
  }
}