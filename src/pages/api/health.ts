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

    // Test database connection
    const { data, error } = await supabase
      .from('checker_templates')
      .select('count')
      .limit(1);

    if (error) throw error;

    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}