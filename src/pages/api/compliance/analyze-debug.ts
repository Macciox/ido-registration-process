import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId } = req.body;

  try {
    console.log('Debug: Starting analysis with:', { documentId, templateId });

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Debug: User authenticated:', user.id);

    // Test database connection
    const { data: document, error: docError } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError) {
      console.error('Debug: Document query error:', docError);
      return res.status(500).json({ error: 'Document query failed', details: docError });
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log('Debug: Document found:', document.filename);

    // Test template query
    const { data: template, error: templateError } = await serviceClient
      .from('checker_templates')
      .select('*, checker_items(*)')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('Debug: Template query error:', templateError);
      return res.status(500).json({ error: 'Template query failed', details: templateError });
    }

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log('Debug: Template found:', template.name, 'with', template.checker_items?.length, 'items');

    // Test compliance_checks table
    const { data: checkData, error: checkError } = await serviceClient
      .from('compliance_checks')
      .insert({
        document_id: documentId,
        template_id: templateId,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (checkError) {
      console.error('Debug: Check creation error:', checkError);
      return res.status(500).json({ error: 'Check creation failed', details: checkError });
    }

    console.log('Debug: Check created:', checkData.id);

    // Return success with debug info
    res.status(200).json({
      success: true,
      debug: {
        user_id: user.id,
        document: { id: document.id, filename: document.filename },
        template: { id: template.id, name: template.name, items_count: template.checker_items?.length },
        check_id: checkData.id
      }
    });

  } catch (error: any) {
    console.error('Debug: Unexpected error:', error);
    res.status(500).json({ 
      error: 'Unexpected error', 
      message: error.message,
      stack: error.stack 
    });
  }
}