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

  const logs: string[] = [];
  
  try {
    logs.push('1. Starting debug upload...');
    
    // Check user auth
    const user = await getCurrentUser();
    if (!user) {
      logs.push('ERROR: User not authenticated');
      return res.status(401).json({ error: 'Unauthorized', logs });
    }
    logs.push(`2. User authenticated: ${user.id}`);

    // Parse form
    logs.push('3. Parsing form data...');
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ mimetype }) => {
        logs.push(`File mimetype: ${mimetype}`);
        return mimetype === 'application/pdf';
      },
    });

    const [fields, files] = await form.parse(req);
    logs.push(`4. Form parsed. Fields: ${Object.keys(fields)}, Files: ${Object.keys(files)}`);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      logs.push('ERROR: No file found in form');
      return res.status(400).json({ error: 'No PDF file provided', logs });
    }
    
    logs.push(`5. File found: ${file.originalFilename}, size: ${file.size}, type: ${file.mimetype}`);

    // Read file
    logs.push('6. Reading file buffer...');
    const fileBuffer = fs.readFileSync(file.filepath);
    logs.push(`7. File buffer read: ${fileBuffer.length} bytes`);

    // Test storage connection
    logs.push('8. Testing storage connection...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      logs.push(`ERROR: Cannot list buckets: ${bucketsError.message}`);
      return res.status(500).json({ error: 'Storage connection failed', logs });
    }
    logs.push(`9. Storage connected. Buckets: ${buckets.map(b => b.name).join(', ')}`);

    // Check if compliance-documents bucket exists
    const complianceBucket = buckets.find(b => b.name === 'compliance-documents');
    if (!complianceBucket) {
      logs.push('ERROR: compliance-documents bucket not found');
      return res.status(500).json({ error: 'Bucket not found', logs });
    }
    logs.push('10. compliance-documents bucket found');

    // Try upload
    const fileName = `debug-${Date.now()}-${file.originalFilename}`;
    logs.push(`11. Attempting upload with filename: ${fileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(`whitepapers/${fileName}`, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      logs.push(`ERROR: Upload failed: ${uploadError.message}`);
      logs.push(`Upload error details: ${JSON.stringify(uploadError)}`);
      return res.status(500).json({ error: 'Upload failed', uploadError, logs });
    }

    logs.push(`12. Upload successful: ${uploadData.path}`);

    // Test database insert
    logs.push('13. Testing database insert...');
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
      logs.push(`ERROR: Database insert failed: ${checkError.message}`);
      logs.push(`DB error details: ${JSON.stringify(checkError)}`);
      return res.status(500).json({ error: 'Database insert failed', checkError, logs });
    }

    logs.push(`14. Database insert successful: ${checkData.id}`);

    res.status(200).json({
      success: true,
      check_id: checkData.id,
      document_path: uploadData.path,
      logs
    });

  } catch (error: any) {
    logs.push(`FATAL ERROR: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
    
    res.status(500).json({
      error: 'Fatal error',
      message: error.message,
      logs
    });
  }
}