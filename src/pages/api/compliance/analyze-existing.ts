import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ingestDocument } from '@/lib/compliance/ingest';
import { analyzeCompliance } from '@/lib/compliance/retrieval';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId } = req.body;

  if (!documentId || !templateId) {
    return res.status(400).json({ error: 'Document ID and template ID required' });
  }

  try {
    // Get document info
    const { data: document, error: docError } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create new compliance check
    const { data: check, error: checkError } = await supabase
      .from('compliance_checks')
      .insert({
        document_id: documentId,
        template_id: templateId,
        status: 'processing'
      })
      .select()
      .single();

    if (checkError) throw checkError;

    // Process document if not already processed
    const { data: existingChunks } = await supabase
      .from('compliance_chunks')
      .select('id')
      .eq('check_id', check.id)
      .limit(1);

    if (!existingChunks || existingChunks.length === 0) {
      await ingestDocument(check.id, document.file_path, 'pdf');
    }

    // Analyze compliance
    const results = await analyzeCompliance(documentId, templateId);

    // Update check with results
    await supabase
      .from('compliance_checks')
      .update({
        status: 'completed',
        results: results.results,
        summary: results.summary
      })
      .eq('id', check.id);

    res.status(200).json({ 
      checkId: check.id,
      results: results.results,
      summary: results.summary
    });

  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
}