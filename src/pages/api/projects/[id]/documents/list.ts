import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: projectId } = req.query;

    // Get documents from database
    const { data: documents, error } = await serviceClient
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get files from Supabase Storage
    const { data: storageFiles, error: storageError } = await serviceClient.storage
      .from('project-documents')
      .list(`projects/${projectId}`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    res.status(200).json({ 
      documents: documents || [],
      storageFiles: storageFiles || []
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
}