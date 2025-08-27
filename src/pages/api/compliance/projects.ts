import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    // Get user's projects from existing IDO platform
    const { data: projects } = await serviceClient
      .from('projects')
      .select('id, name, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return res.status(200).json({ projects: projects || [] });
  }

  // Don't allow creating projects here - use existing IDO projects only

  return res.status(405).json({ error: 'Method not allowed' });
}