import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { processPDFDocument } from '@/lib/pdf-processor';
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
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const { supabase: authClient } = await import('@/lib/supabase');
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      console.log('Invalid token:', authError);
      return res.status(401).json({ error: 'Invalid token' });
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

    // Use service role for both storage and database (RLS bypass needed for API endpoints)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: uploadData, error: uploadError } = await serviceClient.storage
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

    // Insert document record using service role
    const { data: docData, error: docError } = await serviceClient
      .from('compliance_documents')
      .insert({
        user_id: user.id,
        filename: file.originalFilename,
        file_path: uploadData.path,
        file_size: fileBuffer.length,
        mime_type: 'application/pdf',
        processing_status: 'processing'
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

    // Process PDF: extract text and create chunks
    console.log('Starting PDF processing for document ID:', docData.id);
    const processingResult = await processPDFDocument(docData.id, fileBuffer);
    
    console.log('Processing result:', processingResult);
    
    // Update processing status
    const status = processingResult.success ? 'completed' : 'failed';
    await serviceClient
      .from('compliance_documents')
      .update({ processing_status: status })
      .eq('id', docData.id);
    
    if (!processingResult.success) {
      console.error('PDF processing failed:', processingResult.message);
      // Don't fail upload, just mark as failed
    } else {
      console.log('PDF processed successfully:', processingResult.message);
    }

    // Return success response with processing info
    res.status(200).json({
      success: true,
      documentId: docData.id,
      filename: file.originalFilename,
      path: uploadData.path,
      processing: processingResult,
      message: `File uploaded successfully. ${processingResult.message}`
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