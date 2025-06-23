import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Testing Supabase Edge Function...');
    
    // Call the Supabase Edge Function directly
    const { data, error } = await supabase.functions.invoke('rapid-api', {
      body: { 
        email: 'test@example.com',
        code: '123456'
      }
    });
    
    console.log('Supabase Edge Function response:', { data, error });
    
    if (error) {
      console.error('Error from Edge Function:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ 
      success: true, 
      data,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeyFirstChars: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5) + '...' : null
    });
  } catch (err: any) {
    console.error('Error testing Edge Function:', err);
    return res.status(500).json({ error: err.message });
  }
}