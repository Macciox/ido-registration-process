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
    return res.status(400).json({ error: 'checkId is required' });
  }

  try {
    console.log('Getting analysis for checkId:', checkId);
    
    // Get compliance check info
    const { data: check, error: checkError } = await serviceClient
      .from('compliance_checks')
      .select('*')
      .eq('id', checkId)
      .single();

    if (checkError || !check) {
      console.error('Check not found:', checkError);
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    console.log('Found check:', check.id, 'for document:', check.document_id);

    // Get detailed results with template item info
    const { data: results, error: resultsError } = await serviceClient
      .from('compliance_results')
      .select(`
        *,
        checker_items (
          item_name,
          category,
          description
        )
      `)
      .eq('check_id', checkId);

    if (resultsError) {
      console.error('Error fetching results:', resultsError);
    }
    
    console.log('Found results:', results?.length || 0, 'items');
    
    // If no results found, check if analysis was saved properly
    if (!results || results.length === 0) {
      console.log('No results found for checkId:', checkId);
      
      // Try to get saved analysis from saved_analyses table
      const { data: savedAnalysis, error: savedError } = await serviceClient
        .from('saved_analyses')
        .select('analysis_data')
        .eq('check_id', checkId)
        .single();
      
      if (savedAnalysis && savedAnalysis.analysis_data) {
        console.log('Found saved analysis data');
        const analysisData = savedAnalysis.analysis_data;
        
        return res.status(200).json({
          checkId: check.id,
          results: analysisData.results || [],
          summary: analysisData.summary || {
            found_items: 0,
            clarification_items: 0,
            missing_items: 0,
            overall_score: 0
          },
          documentId: check.document_id,
          templateId: check.template_id,
          templateName: check.template_name,
          status: check.status,
          version: check.version,
          created_at: check.created_at
        });
      }
      
      return res.status(404).json({ 
        error: 'No results found in analysis',
        details: 'This analysis may not have been completed or saved properly'
      });
    }

    // Format response like analyze-nosave API
    const formattedResults = (results || []).map(result => ({
      result_id: result.id,
      item_id: result.item_id,
      item_name: result.checker_items?.item_name || result.item_name || 'Unknown Item',
      category: result.checker_items?.category || result.category || 'General',
      status: result.status,
      coverage_score: result.coverage_score,
      reasoning: result.reasoning,
      manually_overridden: result.manually_overridden || false,
      evidence: (result.evidence_snippets || []).map((snippet: string) => ({ snippet })),
      // Legal template fields
      field_type: result.field_type,
      scoring_logic: result.scoring_logic,
      selected_answer: result.selected_answer
    }));

    const summary = {
      found_items: check.found_items || 0,
      clarification_items: check.clarification_items || 0,
      missing_items: check.missing_items || 0,
      overall_score: check.overall_score || 0
    };

    res.status(200).json({
      checkId: check.id,
      results: formattedResults,
      summary,
      documentId: check.document_id,
      templateId: check.template_id,
      templateName: check.template_name,
      status: check.status,
      version: check.version,
      created_at: check.created_at
    });

  } catch (error: any) {
    console.error('Get analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analysis',
      details: error.message 
    });
  }
}