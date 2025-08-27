import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs';

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
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ 
        statusCode: '400',
        error: 'Bad Request',
        message: 'No PDF file provided' 
      });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `${user.id}-${Date.now()}-${file.originalFilename}`;
    const filePath = `whitepapers/${fileName}`;

    // Upload to Supabase Storage with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({
        statusCode: '500',
        error: 'Upload Failed',
        message: uploadError.message
      });
    }

    // Insert into database
    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .insert({
        user_id: user.id,
        project_id: null,
        template_id: '550e8400-e29b-41d4-a716-446655440001',
        input_type: 'pdf',
        document_url: null,
        document_path: uploadData.path,
        status: 'uploaded',
      })
      .select()
      .single();

    if (checkError) {
      return res.status(500).json({
        statusCode: '500',
        error: 'Database Error',
        message: checkError.message
      });
    }

    // Return response in API format
    res.status(200).json({
      Id: checkData.id,
      Key: `compliance-documents/${uploadData.path}`,
      checkId: checkData.id
    });

  } catch (error: any) {
    res.status(500).json({
      statusCode: '500',
      error: 'Internal Server Error',
      message: error.message
    });
  }
}