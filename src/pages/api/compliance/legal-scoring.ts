import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get legal template items with their scoring logic
    const { data: legalTemplate } = await serviceClient
      .from('checker_templates')
      .select('id, name')
      .ilike('name', '%legal%')
      .single();

    if (!legalTemplate) {
      return res.status(404).json({ error: 'Legal template not found' });
    }

    const { data: items } = await serviceClient
      .from('checker_items')
      .select('id, item_name, scoring_logic')
      .eq('template_id', legalTemplate.id)
      .order('sort_order');

    if (!items) {
      return res.status(404).json({ error: 'Legal items not found' });
    }

    // Calculate maximum possible score
    let maxScore = 0;
    const scoringBreakdown = [];

    for (const item of items) {
      const scoringLogic = item.scoring_logic || '';
      
      // Extract maximum score from scoring logic
      // Examples: "Yes = 1000, No = 0", "Not scored", "Yes = 5, No = 0"
      let itemMaxScore = 0;
      
      if (scoringLogic.includes('Not scored')) {
        itemMaxScore = 0; // Not scored items don't contribute to max
      } else {
        // Extract numbers from scoring logic
        const numbers = scoringLogic.match(/\d+/g);
        if (numbers) {
          itemMaxScore = Math.max(...numbers.map((n: string) => parseInt(n)));
        }
      }
      
      maxScore += itemMaxScore;
      scoringBreakdown.push({
        item_name: item.item_name,
        scoring_logic: scoringLogic,
        max_score: itemMaxScore
      });
    }

    return res.status(200).json({
      success: true,
      template_name: legalTemplate.name,
      total_items: items.length,
      max_possible_score: maxScore,
      scoring_breakdown: scoringBreakdown
    });

  } catch (error: any) {
    console.error('Error getting legal scoring:', error);
    return res.status(500).json({
      error: 'Failed to get legal scoring',
      message: error.message
    });
  }
}