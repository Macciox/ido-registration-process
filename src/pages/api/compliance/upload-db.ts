import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
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
    // 1. Skip auth for testing
    const user = { id: 'test-user-123' };

    // 2. Parse file
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 3. Read file
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `test-${Date.now()}.pdf`;

    // 4. Upload to Supabase with service role
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

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(`whitepapers/${fileName}`, fileBuffer, {
        contentType: 'application/pdf'
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    // 5. Insert into database
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
      return res.status(500).json({ error: checkError.message });
    }

    res.status(200).json({ 
      success: true, 
      checkId: checkData.id,
      path: uploadData.path,
      message: 'Upload + DB successful!'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}