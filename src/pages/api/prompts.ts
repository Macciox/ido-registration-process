import { NextApiRequest, NextApiResponse } from 'next';
import { getAllPrompts, getPrompt, updatePrompt } from '@/lib/prompts';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check admin access using same method as other APIs
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('Prompts API: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      console.log('Prompts API: Auth error:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to check role
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      console.log('Prompts API: Access denied for user:', user.email, 'role:', profile?.role);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log('Prompts API: Admin access granted for:', user.email);

    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        const prompt = await getPrompt(id as string);
        if (!prompt) {
          return res.status(404).json({ error: 'Prompt not found' });
        }
        return res.status(200).json({ prompt });
      } else {
        const prompts = await getAllPrompts();
        console.log('Prompts API: Returning', prompts.length, 'prompts');
        return res.status(200).json({ prompts });
      }
    }

    if (req.method === 'PUT') {
      const { id, template } = req.body;
      
      if (!id || !template) {
        return res.status(400).json({ error: 'ID and template required' });
      }

      const success = await updatePrompt(id, template);
      if (!success) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Prompt updated successfully',
        prompt: await getPrompt(id)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Prompts API error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}