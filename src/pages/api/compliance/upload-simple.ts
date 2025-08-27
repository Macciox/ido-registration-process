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
    console.log('1. Starting simple upload...');
    
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('2. User authenticated:', user.id);

    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    const [fields, files] = await form.parse(req);
    console.log('3. Form parsed, fields:', Object.keys(fields), 'files:', Object.keys(files));
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }
    console.log('4. File found:', file.originalFilename, file.size);

    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `${user.id}-${Date.now()}-${file.originalFilename}`;
    const filePath = `whitepapers/${fileName}`;
    console.log('5. File path:', filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error('6. Upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }
    console.log('6. Upload success:', uploadData.path);

    // Insert into database
    const templateId = Array.isArray(fields.templateId) ? fields.templateId[0] : fields.templateId;
    console.log('7. Template ID:', templateId);

    const { data: checkData, error: checkError } = await supabase
      .from('compliance_checks')
      .insert({
        user_id: user.id,
        project_id: null,
        template_id: templateId || '550e8400-e29b-41d4-a716-446655440001',
        input_type: 'pdf',
        document_url: null,
        document_path: uploadData.path,
        status: 'uploaded',
      })
      .select()
      .single();

    if (checkError) {
      console.error('8. DB error:', checkError);
      return res.status(500).json({ error: checkError.message });
    }
    console.log('8. DB insert success:', checkData.id);

    res.status(200).json({
      success: true,
      checkId: checkData.id,
      message: 'Upload successful'
    });

  } catch (error: any) {
    console.error('Fatal error:', error);
    res.status(500).json({ error: error.message });
  }
}