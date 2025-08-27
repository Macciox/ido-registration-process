import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // List files in whitepapers folder
    const { data: files, error } = await supabase.storage
      .from('compliance-documents')
      .list('whitepapers', {
        limit: 100,
        offset: 0
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Filter files for current user
    const userFiles = files?.filter(file => 
      file.name.startsWith(user.id)
    ) || [];

    res.status(200).json({
      success: true,
      totalFiles: files?.length || 0,
      userFiles: userFiles.length,
      files: userFiles.map(file => ({
        name: file.name,
        size: file.metadata?.size,
        created: file.created_at,
        updated: file.updated_at
      }))
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message
    });
  }
}