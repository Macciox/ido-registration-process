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

  const { templateId, item_name, category, description, weight, sort_order, field_type, scoring_logic } = req.body;

  try {
    const { data, error } = await serviceClient
      .from('checker_items')
      .insert({
        template_id: templateId,
        item_name,
        category,
        description,
        weight: weight || 1.0,
        sort_order: sort_order || 0,
        field_type,
        scoring_logic
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}