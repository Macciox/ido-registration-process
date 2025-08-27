import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Headers:', req.headers.authorization);
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('Auth result:', { user: user?.id, error });
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token', details: error });
    }

    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email }
    });

  } catch (error: any) {
    console.error('Test auth error:', error);
    res.status(500).json({ error: error.message });
  }
}