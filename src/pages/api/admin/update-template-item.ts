import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { itemId, updates } = req.body;

    if (!itemId || !updates) {
      return res.status(400).json({ error: 'Missing itemId or updates' });
    }

    const { data, error } = await serviceClient
      .from('checker_items')
      .update(updates)
      .eq('id', itemId);

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Update template item error:', error);
    res.status(500).json({ error: 'Failed to update template item' });
  }
}