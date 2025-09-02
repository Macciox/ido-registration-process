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

  const { documentId, templateId, overwrite = false } = req.body;

  try {
    // Get document and template info
    const [docResult, templateResult] = await Promise.all([
      serviceClient.from('documents').select('*').eq('id', documentId).single(),
      serviceClient.from('checker_templates').select('*, checker_items(*)').eq('id', templateId).single()
    ]);

    if (docResult.error || templateResult.error) {
      return res.status(404).json({ error: 'Document or template not found' });
    }

    const document = docResult.data;
    const template = templateResult.data;

    // Check if analysis already exists
    const { data: existingCheck } = await serviceClient
      .from('compliance_checks')
      .select('*')
      .eq('document_id', documentId)
      .eq('template_id', templateId)
      .single();

    if (existingCheck && !overwrite) {
      return res.status(409).json({ 
        error: 'Analysis already exists',
        existing: true,
        checkId: existingCheck.id,
        message: 'Analysis for this document and template already exists. Do you want to overwrite it?'
      });
    }

    // Get document content
    const { data: chunks } = await serviceClient
      .from('document_chunks')
      .select('content')
      .eq('document_id', documentId);

    const documentContent = chunks?.map(chunk => chunk.content).join('\n\n') || '';

    // Create or update compliance check
    let checkId = existingCheck?.id;
    
    if (!existingCheck) {
      const { data: newCheck, error: checkError } = await serviceClient
        .from('compliance_checks')
        .insert({
          document_id: documentId,
          template_id: templateId,
          document_name: document.filename,
          template_name: template.name,
          status: 'processing'
        })
        .select()
        .single();

      if (checkError) throw checkError;
      checkId = newCheck.id;
    } else {
      // Update existing check
      await serviceClient
        .from('compliance_checks')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', checkId);

      // Delete existing results
      await serviceClient
        .from('compliance_results')
        .delete()
        .eq('check_id', checkId);
    }

    // Analyze each item with GPT
    const results = [];
    let foundItems = 0;
    let clarificationItems = 0;
    let missingItems = 0;
    let totalScore = 0;

    for (const item of template.checker_items) {
      try {
        const prompt = `Analyze this MiCA compliance requirement:

Requirement: ${item.item_name}
Category: ${item.category}
Description: ${item.description}

DOCUMENT CONTENT:
${documentContent}

Evaluate if this requirement is met in the document above.

Respond ONLY in JSON format:
{
  "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
  "coverage_score": 0-100,
  "reasoning": "Brief analysis",
  "evidence_snippets": ["relevant text if found"]
}`;

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
          })
        });

        const gptData = await gptResponse.json();
        const gptContent = gptData.choices?.[0]?.message?.content;
        
        let analysis;
        try {
          analysis = JSON.parse(gptContent);
        } catch {
          analysis = {
            status: 'MISSING',
            coverage_score: 0,
            reasoning: 'Failed to parse GPT response',
            evidence_snippets: []
          };
        }

        // Save result to database
        const { error: resultError } = await serviceClient
          .from('compliance_results')
          .insert({
            check_id: checkId,
            item_id: item.id,
            status: analysis.status,
            coverage_score: analysis.coverage_score || 0,
            reasoning: analysis.reasoning || '',
            evidence_snippets: analysis.evidence_snippets || []
          });

        if (resultError) {
          console.error('Error saving result:', resultError);
        }

        // Update counters
        if (analysis.status === 'FOUND') foundItems++;
        else if (analysis.status === 'NEEDS_CLARIFICATION') clarificationItems++;
        else missingItems++;
        
        totalScore += (analysis.coverage_score || 0) * (item.weight || 1);

        results.push({
          item_name: item.item_name,
          category: item.category,
          status: analysis.status,
          coverage_score: analysis.coverage_score || 0,
          reasoning: analysis.reasoning || '',
          evidence: analysis.evidence_snippets?.map((snippet: string) => ({ snippet })) || []
        });

      } catch (error) {
        console.error(`Error analyzing item ${item.id}:`, error);
        
        // Save error result
        await serviceClient
          .from('compliance_results')
          .insert({
            check_id: checkId,
            item_id: item.id,
            status: 'MISSING',
            coverage_score: 0,
            reasoning: 'Analysis failed due to error',
            evidence_snippets: []
          });

        missingItems++;
        results.push({
          item_name: item.item_name,
          category: item.category,
          status: 'MISSING',
          coverage_score: 0,
          reasoning: 'Analysis failed due to error',
          evidence: []
        });
      }
    }

    // Calculate overall score
    const totalWeight = template.checker_items.reduce((sum: number, item: any) => sum + (item.weight || 1), 0);
    const overallScore = Math.round(totalScore / totalWeight);

    // Update compliance check status
    await serviceClient
      .from('compliance_checks')
      .update({ 
        status: 'completed',
        overall_score: overallScore,
        found_items: foundItems,
        clarification_items: clarificationItems,
        missing_items: missingItems
      })
      .eq('id', checkId);

    res.status(200).json({
      success: true,
      checkId,
      saved: true,
      overwritten: !!existingCheck,
      summary: {
        found_items: foundItems,
        clarification_items: clarificationItems,
        missing_items: missingItems,
        overall_score: overallScore
      },
      results
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}