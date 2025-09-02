import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { checkId } = req.query;

  if (!checkId) {
    return res.status(400).json({ error: 'Check ID is required' });
  }

  try {
    // Get compliance check info
    const { data: check, error: checkError } = await serviceClient
      .from('compliance_checks')
      .select(`
        *,
        documents(filename),
        checker_templates(name, type)
      `)
      .eq('id', checkId)
      .single();

    if (checkError || !check) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Get all results for this check
    const { data: results, error: resultsError } = await serviceClient
      .from('compliance_results')
      .select(`
        *,
        checker_items(item_name, category, description)
      `)
      .eq('check_id', checkId)
      .order('id');

    if (resultsError) throw resultsError;

    // Format results
    const formattedResults = results?.map(result => ({
      item_name: result.checker_items.item_name,
      category: result.checker_items.category,
      status: result.status,
      coverage_score: result.coverage_score,
      reasoning: result.reasoning,
      evidence: result.evidence_snippets?.map((snippet: string) => ({ snippet })) || []
    })) || [];

    res.status(200).json({
      success: true,
      checkId: check.id,
      document_name: check.documents.filename,
      template_name: check.checker_templates.name,
      template_type: check.checker_templates.type,
      created_at: check.created_at,
      updated_at: check.updated_at,
      summary: {
        found_items: check.found_items || 0,
        clarification_items: check.clarification_items || 0,
        missing_items: check.missing_items || 0,
        overall_score: check.overall_score || 0
      },
      results: formattedResults
    });

  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch analysis' });
  }
}