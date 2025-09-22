import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: projectId } = req.query;

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const documentType = Array.isArray(fields.document_type) ? fields.document_type[0] : fields.document_type;
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file and upload to Supabase Storage
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename?.split('.').pop() || 'pdf';
    const storagePath = `projects/${projectId}/${documentType}/${Date.now()}-${file.originalFilename}`;
    
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('project-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Get public URL
    const { data: { publicUrl } } = serviceClient.storage
      .from('project-documents')
      .getPublicUrl(storagePath);

    // Save document record to database
    const { data: document, error } = await serviceClient
      .from('project_documents')
      .insert({
        project_id: projectId,
        document_type: documentType,
        title: title,
        description: description,
        file_url: publicUrl,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    res.status(200).json({ document });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}