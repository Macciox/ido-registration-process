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

  const logs: string[] = [];
  
  try {
    logs.push('1. Starting fixed upload...');
    
    // Check user auth
    const user = await getCurrentUser();
    if (!user) {
      logs.push('ERROR: User not authenticated');
      return res.status(401).json({ error: 'Unauthorized', logs });
    }
    logs.push(`2. User authenticated: ${user.id}`);

    // Create Supabase client with service role for storage operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    logs.push('3. Supabase client created with service role');

    // Parse form
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ mimetype }) => {
        logs.push(`File mimetype: ${mimetype}`);
        return mimetype === 'application/pdf';
      },
    });

    const [fields, files] = await form.parse(req);
    logs.push(`4. Form parsed`);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      logs.push('ERROR: No file found');
      return res.status(400).json({ error: 'No PDF file provided', logs });
    }
    
    logs.push(`5. File: ${file.originalFilename}, size: ${file.size}`);

    // Read file as buffer
    const fileBuffer = fs.readFileSync(file.filepath);
    logs.push(`6. File buffer: ${fileBuffer.length} bytes`);

    // Generate unique filename
    const fileName = `${user.id}-${Date.now()}-${file.originalFilename}`;
    const filePath = `whitepapers/${fileName}`;
    logs.push(`7. Upload path: ${filePath}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logs.push(`ERROR: Upload failed - ${uploadError.message}`);
      logs.push(`Error details: ${JSON.stringify(uploadError)}`);
      return res.status(500).json({ 
        error: 'Upload failed', 
        details: uploadError,
        logs 
      });
    }

    logs.push(`8. Upload successful: ${uploadData.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('compliance-documents')
      .getPublicUrl(uploadData.path);

    logs.push(`9. Public URL: ${urlData.publicUrl}`);

    // Insert into database
    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .insert({
        user_id: user.id,
        project_id: null,
        template_id: '550e8400-e29b-41d4-a716-446655440001',
        input_type: 'pdf',
        document_url: urlData.publicUrl,
        document_path: uploadData.path,
        status: 'uploaded',
      })
      .select()
      .single();

    if (checkError) {
      logs.push(`ERROR: Database insert failed - ${checkError.message}`);
      return res.status(500).json({ 
        error: 'Database insert failed', 
        details: checkError,
        logs 
      });
    }

    logs.push(`10. Database record created: ${checkData.id}`);

    res.status(200).json({
      success: true,
      check_id: checkData.id,
      document_path: uploadData.path,
      document_url: urlData.publicUrl,
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