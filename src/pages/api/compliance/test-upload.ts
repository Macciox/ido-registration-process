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

    const { data, error } = await supabase.storage
      .from('compliance-documents')
      .upload(`whitepapers/${fileName}`, fileBuffer, {
        contentType: 'application/pdf'
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ 
      success: true, 
      path: data.path,
      message: 'Upload successful!'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}