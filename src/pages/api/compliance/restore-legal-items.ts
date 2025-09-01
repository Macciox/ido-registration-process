import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const legalItems = [
  {
    category: "MiFID II - Financial Instrument",
    item_name: "Rights similar to shares/bonds",
    description: "Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights?",
    weight: 1.0,
    sort_order: 1
  },
  {
    category: "MiFID II - Financial Instrument", 
    item_name: "Derivative structure",
    description: "Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)?",
    weight: 1.0,
    sort_order: 2
  },
  {
    category: "MiFID II - Financial Instrument",
    item_name: "Negotiable securities",
    description: "Is the token part of a class of securities that are negotiable on financial or secondary markets?",
    weight: 1.0,
    sort_order: 3
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Find Legal Opinion template
    const { data: template } = await serviceClient
      .from('checker_templates')
      .select('*')
      .eq('type', 'legal')
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Legal Opinion template not found' });
    }

    // Add items to the template
    const itemsWithTemplateId = legalItems.map(item => ({
      ...item,
      template_id: template.id
    }));

    const { data: items, error: itemsError } = await serviceClient
      .from('checker_items')
      .insert(itemsWithTemplateId)
      .select();

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    res.status(200).json({ 
      success: true, 
      items_created: items.length,
      message: 'Legal Opinion items restored'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}