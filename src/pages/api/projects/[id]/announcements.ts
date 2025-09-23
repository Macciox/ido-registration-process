import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
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
      .from('announcement_schedule')
      .select('*')
      .eq('project_id', projectId)
      .order('scheduled_date');

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { phase, post_name, twitter, telegram, email, scheduled_date, notes } = req.body;

    const { data, error } = await supabase
      .from('announcement_schedule')
      .insert({
        project_id: projectId,
        phase,
        post_name,
        twitter,
        telegram,
        email,
        scheduled_date,
        notes
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'PUT') {
    const { id, phase, post_name, twitter, telegram, email, scheduled_date, notes } = req.body;

    const { data, error } = await supabase
      .from('announcement_schedule')
      .update({
        phase,
        post_name,
        twitter,
        telegram,
        email,
        scheduled_date,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;

    const { error } = await supabase
      .from('announcement_schedule')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}