import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized - Admin only' });
    }

    const { id: projectId } = req.query;
    const { deleteDocuments } = req.body;

    console.log('Deleting project:', projectId, 'deleteDocuments:', deleteDocuments);

    // Check if project exists
    const { data: project, error: projectError } = await serviceClient
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get documents if we need to delete them
    if (deleteDocuments) {
      const { data: documents } = await serviceClient
        .from('project_documents')
        .select('id, file_url')
        .eq('project_id', projectId);

      if (documents && documents.length > 0) {
        // Delete files from storage
        for (const doc of documents) {
          if (doc.file_url && doc.file_url.includes('supabase')) {
            try {
              const pathMatch = doc.file_url.match(/projects\/[^?]+/);
              if (pathMatch) {
                await serviceClient.storage
                  .from('project-documents')
                  .remove([pathMatch[0]]);
              }
            } catch (err) {
              console.error('Error deleting file:', err);
            }
          }
        }

        // Delete document records
        await serviceClient
          .from('project_documents')
          .delete()
          .eq('project_id', projectId);
      }
    }

    // Delete project owners
    await serviceClient
      .from('projectowner_whitelist')
      .delete()
      .eq('project_id', projectId);

    // Delete project
    const { error: deleteError } = await serviceClient
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Delete project API error:', error);
    res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }
}