import { NextApiRequest, NextApiResponse } from 'next';
import { getAllPrompts, getPrompt, updatePrompt } from '@/lib/prompts';
import { getCurrentUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check admin access
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        const prompt = getPrompt(id as string);
        if (!prompt) {
          return res.status(404).json({ error: 'Prompt not found' });
        }
        return res.status(200).json({ prompt });
      } else {
        const prompts = getAllPrompts();
        return res.status(200).json({ prompts });
      }
    }

    if (req.method === 'PUT') {
      const { id, template } = req.body;
      
      if (!id || !template) {
        return res.status(400).json({ error: 'ID and template required' });
      }

      const success = updatePrompt(id, template);
      if (!success) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Prompt updated successfully',
        prompt: getPrompt(id)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Prompts API error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}