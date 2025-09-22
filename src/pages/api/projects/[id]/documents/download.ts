import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'File URL required' });
    }

    // Redirect to Supabase Storage URL
    res.redirect(302, url);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
}