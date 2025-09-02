import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getDocumentHash } from '@/lib/analysis-utils';
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
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file content and calculate hash
    const fileBuffer = fs.readFileSync(file.filepath);
    const { docHash, fileName } = getDocumentHash(fileBuffer, file.originalFilename || 'document.pdf');

    // Upload file to Supabase Storage
    const fileExt = fileName.split('.').pop();
    const storagePath = `documents/${user.id}/${docHash}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('compliance-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Get public URL
    const { data: { publicUrl } } = serviceClient.storage
      .from('compliance-documents')
      .getPublicUrl(storagePath);

    // Save document record
    const { data: document, error: dbError } = await serviceClient
      .from('compliance_documents')
      .insert({
        user_id: user.id,
        filename: fileName,
        file_path: storagePath,
        doc_hash: docHash,
        document_url: publicUrl,
        file_size: file.size,
        mime_type: file.mimetype
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save document record' });
    }

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        docHash: document.doc_hash,
        documentUrl: document.document_url,
        fileSize: document.file_size
      },
      message: 'Document uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
}