import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resultId, newStatus } = req.body;

    if (!resultId || !newStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validStatuses = ['FOUND', 'NEEDS_CLARIFICATION', 'MISSING', 'NOT_APPLICABLE'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if this is a temporary result ID (for unsaved analyses)
    if (resultId.startsWith('temp-')) {
      // For temporary results, we just return success
      // The frontend will handle the local state update
      return res.status(200).json({ success: true, temporary: true });
    }

    // Update the compliance result in database
    const { error } = await serviceClient
      .from('compliance_results')
      .update({ 
        status: newStatus,
        manually_overridden: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}