import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('projectowner_whitelist')
      .select(`
        project_id,
        projects (*)
      `)
      .eq('email', user.email)
      .eq('status', 'registered');

    if (error) return res.status(500).json({ error: error.message });
    
    const projects = data?.map(entry => entry.projects).filter(Boolean) || [];
    return res.json(projects);
  }

  res.status(405).json({ error: 'Method not allowed' });
}