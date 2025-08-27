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
    // Get user's projects
    const { data: projects } = await serviceClient
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return res.status(200).json({ projects: projects || [] });
  }

  if (req.method === 'POST') {
    // Create new project
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name required' });
    }

    const { data: project, error } = await serviceClient
      .from('projects')
      .insert({
        name,
        description: description || '',
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create project', message: error.message });
    }

    return res.status(201).json({ project });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}