import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    const { data: templates, error: templatesError } = await supabase
      .from('checker_templates')
      .select('*')
      .limit(1);

    // Test storage bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    // Test OpenAI key
    const openaiConfigured = !!process.env.OPENAI_API_KEY;

    res.status(200).json({
      database: templatesError ? `Error: ${templatesError.message}` : 'Connected',
      storage: bucketsError ? `Error: ${bucketsError.message}` : `${buckets?.length || 0} buckets`,
      openai: openaiConfigured ? 'Configured' : 'Missing',
      environment: process.env.NODE_ENV,
      templates: templates?.length || 0
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
}