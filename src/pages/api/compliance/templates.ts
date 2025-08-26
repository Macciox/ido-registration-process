import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: templates, error } = await supabase
      .from('checker_templates')
      .select(`
        id,
        name,
        type,
        description,
        is_active,
        checker_items (
          id,
          category,
          item_name,
          description,
          weight,
          sort_order
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    res.status(200).json({ templates });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}