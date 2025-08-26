import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface IngestRequest {
  url?: string;
  project_id?: string;
  template_id?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contentType = req.headers['content-type'] || '';
    let inputType: 'pdf' | 'url';
    let documentUrl: string | null = null;
    let documentPath: string | null = null;
    let projectId: string | null = null;
    let templateId: string = '550e8400-e29b-41d4-a716-446655440001';

    if (contentType.includes('multipart/form-data')) {
      const form = formidable({
        maxFileSize: 50 * 1024 * 1024,
        filter: ({ mimetype }) => mimetype === 'application/pdf',
      });

      const [fields, files] = await form.parse(req);
      
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) {
        return res.status(400).json({ error: 'No PDF file provided' });
      }

      const fileBuffer = fs.readFileSync(file.filepath);
      const fileName = `${Date.now()}-${file.originalFilename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('compliance-documents')
        .upload(`whitepapers/${fileName}`, fileBuffer, {
          contentType: 'application/pdf',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      inputType = 'pdf';
      documentPath = uploadData.path;
      
      if (fields.project_id) {
        projectId = Array.isArray(fields.project_id) ? fields.project_id[0] : fields.project_id;
      }
      if (fields.template_id) {
        templateId = Array.isArray(fields.template_id) ? fields.template_id[0] : fields.template_id;
      }

    } else {
      const body: IngestRequest = JSON.parse(req.body);
      
      if (!body.url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      try {
        new URL(body.url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      inputType = 'url';
      documentUrl = body.url;
      projectId = body.project_id || null;
      templateId = body.template_id || templateId;
    }

    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .insert({
        user_id: user.id,
        project_id: projectId,
        template_id: templateId,
        input_type: inputType,
        document_url: documentUrl,
        document_path: documentPath,
        status: 'uploaded',
      })
      .select()
      .single();

    if (checkError) {
      throw new Error(`Failed to create check: ${checkError.message}`);
    }

    res.status(200).json({
      check_id: checkData.id,
      status: 'uploaded',
      message: 'Document uploaded successfully. Processing will begin shortly.',
    });

  } catch (error: any) {
    console.error('Ingest error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}