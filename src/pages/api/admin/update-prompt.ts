import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || (user as any).user_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id, content, description } = req.body;

    if (!id || !content) {
      return res.status(400).json({ error: 'Missing id or content' });
    }

    // Read current prompts file
    const promptsPath = path.join(process.cwd(), 'src/lib/compliance/prompts.ts');
    let promptsContent = fs.readFileSync(promptsPath, 'utf8');

    // Update the specific prompt
    const promptRegex = new RegExp(`(${id}:\\s*)(['"])(.*?)\\2`, 's');
    const match = promptsContent.match(promptRegex);
    
    if (match) {
      const updatedContent = content.replace(/'/g, "\\'").replace(/"/g, '\\"');
      promptsContent = promptsContent.replace(
        promptRegex,
        `$1$2${updatedContent}$2`
      );
      
      fs.writeFileSync(promptsPath, promptsContent);
      
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: 'Prompt not found' });
    }
  } catch (error: any) {
    console.error('Update prompt error:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
}