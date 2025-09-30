import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DocumentHash {
  docHash: string;
  fileName: string;
}

export interface AnalysisResult {
  item_id: string;
  item_name: string;
  category: string;
  status: 'FOUND' | 'NEEDS_CLARIFICATION' | 'MISSING';
  coverage_score: number;
  reasoning: string;
  evidence: Array<{ snippet: string }>;
  field_type?: string;
  scoring_logic?: string;
  selected_answer?: string;
}

export interface AnalysisData {
  results: AnalysisResult[];
  summary: {
    found_items: number;
    clarification_items: number;
    missing_items: number;
    not_applicable_items?: number;
    applicable_items?: number;
    overall_score: number;
  };
}

/**
 * Calculate SHA-256 hash of document content
 */
export function getDocumentHash(content: Buffer | string, fileName: string): DocumentHash {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  
  return {
    docHash: hash.digest('hex'),
    fileName: fileName
  };
}

/**
 * Save analysis results to database
 */
export async function saveAnalysis(
  docId: string,
  docHash: string,
  docName: string,
  templateId: string,
  analysisData: AnalysisData,
  overwrite: boolean = false,
  projectId?: string,
  specificCheckId?: string
): Promise<{ success: boolean; checkId?: string; version?: number; message: string }> {
  
  try {
    // Get template info first
    const { data: template } = await serviceClient
      .from('checker_templates')
      .select('name')
      .eq('id', templateId)
      .single();
    
    const templateName = template?.name || 'Unknown Template';
    
    // Check existing analyses for this document
  const { data: existingChecks, error: fetchError } = await serviceClient
    .from('compliance_checks')
    .select('id, version')
    .eq('document_id', docId)
    .eq('template_id', templateId)
    .order('version', { ascending: false });
    
  if (fetchError) {
    console.error('Error fetching existing checks:', fetchError);
  }
  
  console.log('Existing checks for doc/template:', { docId, templateId, existingChecks });

  let checkId: string;
  let version: number;

  if (existingChecks && existingChecks.length > 0) {
    let targetCheck = existingChecks[0]; // Default to latest
    
    // If specific check ID provided, find that version
    if (specificCheckId && overwrite) {
      const specificCheck = existingChecks.find(check => check.id === specificCheckId);
      if (specificCheck) {
        targetCheck = specificCheck;
      }
    }
    
    if (overwrite) {
      // Update existing analysis (either latest or specific version)
      checkId = targetCheck.id;
      version = targetCheck.version;
      
      // Update compliance_checks
      await serviceClient
        .from('compliance_checks')
        .update({
          overall_score: analysisData.summary.overall_score,
          found_items: analysisData.summary.found_items,
          clarification_items: analysisData.summary.clarification_items,
          missing_items: analysisData.summary.missing_items,
          updated_at: new Date().toISOString()
        })
        .eq('id', checkId);

      // Delete old results
      await serviceClient
        .from('compliance_results')
        .delete()
        .eq('check_id', checkId);
        
    } else {
      // Create new version
      version = targetCheck.version + 1;
      console.log('Creating new version:', version, 'for document:', docId);
      
      const { data: newCheck, error: insertError } = await serviceClient
        .from('compliance_checks')
        .insert({
          document_id: docId,
          template_id: templateId,
          document_name: docName,
          template_name: templateName,
          status: 'ready',
          input_type: 'pdf',
          version: version,
          overall_score: analysisData.summary.overall_score,
          found_items: analysisData.summary.found_items,
          clarification_items: analysisData.summary.clarification_items,
          missing_items: analysisData.summary.missing_items,
          project_id: projectId
        })
        .select('id')
        .single();
        
      if (insertError || !newCheck) {
        throw new Error(`Failed to create new analysis: ${insertError?.message || 'Unknown error'}`);
      }
        
      checkId = newCheck.id;
    }
  } else {
    // First analysis for this document
    version = 1;
    console.log('Creating first analysis version 1 for document:', docId);
    
    const { data: newCheck, error: insertError } = await serviceClient
      .from('compliance_checks')
      .insert({
        document_id: docId,
        template_id: templateId,
        document_name: docName,
        template_name: templateName,
        status: 'ready',
        input_type: 'pdf',
        version: version,
        overall_score: analysisData.summary.overall_score,
        found_items: analysisData.summary.found_items,
        clarification_items: analysisData.summary.clarification_items,
        missing_items: analysisData.summary.missing_items,
        not_applicable_items: analysisData.summary.not_applicable_items || 0,
        applicable_items: analysisData.summary.applicable_items || analysisData.summary.found_items + analysisData.summary.clarification_items + analysisData.summary.missing_items,
        project_id: projectId
      })
      .select('id')
      .single();
      
    if (insertError || !newCheck) {
      throw new Error(`Failed to create first analysis: ${insertError?.message || 'Unknown error'}`);
    }
      
    checkId = newCheck.id;
  }

  // Insert detailed results
  if (analysisData.results && analysisData.results.length > 0) {
    const resultsToInsert = analysisData.results.map(result => ({
      check_id: checkId,
      item_id: result.item_id,
      status: result.status,
      coverage_score: result.coverage_score,
      reasoning: result.reasoning,
      evidence_snippets: result.evidence?.map(e => e.snippet) || [],
      field_type: result.field_type || null,
      scoring_logic: result.scoring_logic || null,
      selected_answer: result.selected_answer || null,
      risk_score: (result as any).risk_score || 0
    }));

    const { error: resultsError } = await serviceClient
      .from('compliance_results')
      .insert(resultsToInsert);
      
    if (resultsError) {
      console.error('Error inserting results:', resultsError);
      // Don't fail the whole operation for results insertion
    }
  }

  // Update document hash if provided
  if (docHash) {
    const { error: hashError } = await serviceClient
      .from('compliance_documents')
      .update({ doc_hash: docHash })
      .eq('id', docId);
      
    if (hashError) {
      console.error('Error updating document hash:', hashError);
      // Don't fail the whole operation for hash update
    }
  }

    return { 
      success: true, 
      checkId, 
      version, 
      message: overwrite ? 'Analysis updated successfully' : 'New analysis version created'
    };
  } catch (error: any) {
    console.error('Error in saveAnalysis:', error);
    return {
      success: false,
      message: `Save failed: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Get latest analyses for all documents
 */
export async function getLatestAnalyses(): Promise<any[]> {
  try {
    const { data, error } = await serviceClient
    .from('compliance_documents')
    .select(`
      id,
      filename,
      doc_hash,
      document_url,
      created_at,
      compliance_checks!inner (
        id,
        version,
        overall_score,
        found_items,
        clarification_items,
        missing_items,
        status,
        created_at,
        template_name,
        project_id,
        projects(name)
      )
    `);

    if (error) {
      console.error('Error fetching analyses:', error);
      return [];
    }
    
    if (!data) return [];

  // Get ALL versions for each document (not just latest)
  const allAnalyses: any[] = [];
  
  data.forEach(doc => {
    doc.compliance_checks
      .sort((a: any, b: any) => b.version - a.version) // Sort by version desc
      .forEach((check: any) => {
        allAnalyses.push({
          document_id: doc.id,
          filename: doc.filename,
          doc_hash: doc.doc_hash,
          document_url: doc.document_url,
          document_created_at: doc.created_at,
          check_id: check.id,
          version: check.version,
          overall_score: check.overall_score,
          found_items: check.found_items,
          clarification_items: check.clarification_items,
          missing_items: check.missing_items,
          status: check.status,
          analysis_created_at: check.created_at,
          template_name: check.template_name,
          project_id: check.project_id,
          project_name: check.projects?.name || null
        });
      });
  });

    return allAnalyses;
  } catch (error) {
    console.error('Error in getLatestAnalyses:', error);
    return [];
  }
}