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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('User authenticated:', user.id);

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req);
    console.log('Form parsed, files:', Object.keys(files));
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('File details:', {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size
    });

    // Test simple upload
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `test-${Date.now()}.pdf`;
    
    console.log('Attempting upload to storage...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(`test/${fileName}`, fileBuffer, {
        contentType: file.mimetype || 'application/pdf',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ 
        error: 'Upload failed', 
        details: uploadError.message 
      });
    }

    console.log('Upload successful:', uploadData);

    res.status(200).json({
      success: true,
      path: uploadData.path,
      message: 'Test upload successful'
    });

  } catch (error: any) {
    console.error('Test upload error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
}