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
    // Add columns using raw SQL
    const { error } = await serviceClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE checker_items 
        ADD COLUMN IF NOT EXISTS field_type TEXT,
        ADD COLUMN IF NOT EXISTS scoring_logic TEXT;
      `
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ success: true, message: 'Columns added successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}