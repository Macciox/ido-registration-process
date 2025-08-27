import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ingestDocument } from '@/lib/compliance/ingest';
import { retrieveWithExpansion } from '@/lib/compliance/retrieval';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId } = req.body;

  if (!documentId || !templateId) {
    return res.status(400).json({ error: 'Document ID and template ID required' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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

    // Mock analysis results for now
    const results = {
      results: [],
      summary: {
        found_items: 0,
        clarification_items: 0,
        missing_items: 0,
        overall_score: 0
      }
    };

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