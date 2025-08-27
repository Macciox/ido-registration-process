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
    console.log('Upload request received');
    const user = await getCurrentUser();
    if (!user) {
      console.log('User not authenticated');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('User authenticated:', user.id);

    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      console.log('No file provided in request');
      return res.status(400).json({ 
        statusCode: '400',
        error: 'Bad Request',
        message: 'No PDF file provided' 
      });
    }
    console.log('File received:', file.originalFilename, file.size);

    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `${user.id}-${Date.now()}-${file.originalFilename}`;
    const filePath = `whitepapers/${fileName}`;

    // Upload to Supabase Storage with service role (storage doesn't use RLS)
    const storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Use normal client for database operations (with RLS)
    const { supabase } = await import('@/lib/supabase');

    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('compliance-documents')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({
        statusCode: '500',
        error: 'Upload Failed',
        message: uploadError.message
      });
    }
    console.log('File uploaded to storage:', uploadData.path);

    // Insert document record
    const { data: docData, error: docError } = await supabase
      .from('compliance_documents')
      .insert({
        user_id: user.id,
        filename: file.originalFilename,
        file_path: uploadData.path,
        file_size: fileBuffer.length,
        mime_type: 'application/pdf'
      })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      return res.status(500).json({
        statusCode: '500',
        error: 'Database Error',
        message: docError.message
      });
    }
    console.log('Document record created:', docData.id);

    // Insert compliance check
    const templateId = Array.isArray(fields.templateId) ? fields.templateId[0] : fields.templateId;
    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .insert({
        document_id: docData.id,
        template_id: templateId,
        status: 'uploaded'
      })
      .select()
      .single();

    if (checkError) {
      console.error('Check insert error:', checkError);
      return res.status(500).json({
        statusCode: '500',
        error: 'Database Error',
        message: checkError.message
      });
    }
    console.log('Compliance check created:', checkData.id);

    // Return response in API format
    res.status(200).json({
      Id: checkData.id,
      Key: `compliance-documents/${uploadData.path}`,
      checkId: checkData.id
    });

  } catch (error: any) {
    console.error('Upload handler error:', error);
    res.status(500).json({
      statusCode: '500',
      error: 'Internal Server Error',
      message: error.message
    });
  }
}