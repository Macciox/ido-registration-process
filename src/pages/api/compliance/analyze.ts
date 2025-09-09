import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import { retrieveWithExpansion } from '@/lib/compliance/retrieval';
import { Result, ResultType } from '@/lib/compliance/schema';
import { getPromptForTemplate, formatPrompt, COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';
import { renderPrompt } from '@/lib/prompts';

interface AnalyzeRequest {
  check_id?: string;
  documentId?: string;
  templateId?: string;
  whitepaperSection?: string;
}



async function analyzeItemWithContent(
  item: any,
  documentContent: string,
  templateType: string,
  retries: number = 2
): Promise<ResultType> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Use centralized prompt system for all template types
  let userPrompt: string;
  
  if (templateType === 'legal') {
    // For legal templates, the prompt is already constructed with placeholders replaced
    userPrompt = item.description;
  } else {
    try {
      const promptId = templateType === 'whitepaper' ? 'WHITEPAPER_ANALYSIS' : 'COMPLIANCE_ANALYSIS';
      
      userPrompt = await renderPrompt(promptId, {
        requirementsList: `Category: ${item.category}\nItem: ${item.item_name}\nDescription: ${item.description}`,
        documentContent: documentContent
      });
    } catch (error: any) {
      // Fallback to old system if centralized prompt fails
      const promptTemplate = getPromptForTemplate(templateType);
      userPrompt = formatPrompt(promptTemplate, {
        category: item.category,
        item_name: item.item_name,
        description: item.description,
        relevant_content: documentContent
      });
    }
  }
  
  console.log('Prompt length:', userPrompt.length);
  console.log('Prompt preview:', userPrompt.substring(0, 500) + '...');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: templateType === 'legal' ? [
            { role: 'user', content: userPrompt }
          ] : [
            { role: 'system', content: COMPLIANCE_PROMPTS.SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Log OpenAI response for debugging
      console.log('OpenAI response length:', content.length);
      console.log('OpenAI response preview:', content.substring(0, 1000) + '...');
      console.log('=== FULL OPENAI RESPONSE ===');
      console.log(content);
      console.log('=== END FULL RESPONSE ===');
      
      // Parse and validate JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
        console.log('Parsed JSON structure:', Array.isArray(parsed) ? `Array with ${parsed.length} items` : 'Single object');
      } catch (jsonError: any) {
        console.error('JSON parse error. Content:', content.substring(0, 500) + '...');
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }
      
      // Handle legal template array response vs single object
      if (templateType === 'legal' && Array.isArray(parsed)) {
        // For legal analysis, return a result with the full array stored
        const result = {
          status: 'FOUND' as const,
          coverage_score: 0,
          evidence: [] as any[],
          reasoning: 'Legal analysis completed'
        };
        // Store the full array in the new format
        (result as any).fullLegalResults = parsed;
        return result as ResultType;
      }
      
      const validated = Result.parse(parsed);
      return validated;

    } catch (error: any) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries) {
        // Final fallback
        return {
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
          evidence: [],
          reasoning: `Analysis failed after ${retries + 1} attempts: ${error.message}`,
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  // Final fallback if all retries failed
  return {
    status: 'NEEDS_CLARIFICATION',
    coverage_score: 0,
    evidence: [],
    reasoning: `Analysis failed after ${retries + 1} attempts`,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { check_id, documentId, templateId, whitepaperSection }: AnalyzeRequest = req.body;

    // Handle both existing check analysis and new document analysis
    if (!check_id && (!documentId || !templateId)) {
      return res.status(400).json({ error: 'Either check_id or (documentId + templateId) is required' });
    }

    // If documentId provided, analyze directly without creating check
    if (documentId && templateId) {
      // Get existing chunks for this document
      const { data: existingChunks } = await serviceClient
        .from('compliance_chunks')
        .select('content, page')
        .eq('document_id', documentId)
        .order('page')
        .limit(43);

      if (!existingChunks || existingChunks.length === 0) {
        return res.status(400).json({ 
          error: 'No document chunks found. Please re-upload the document.' 
        });
      }

      // Get template and items
      const { data: template } = await serviceClient
        .from('checker_templates')
        .select('*, checker_items(*)')
        .eq('id', templateId)
        .single();

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Create document content from existing chunks
      const documentContent = existingChunks.map((chunk, i) => 
        `[Excerpt ${i + 1}${chunk.page ? ` - Page ${chunk.page}` : ''}]\n${chunk.content}`
      ).join('\n\n');

      console.log(`Using ${existingChunks.length} existing chunks for analysis (${documentContent.length} chars)`);

      const results = [];
      let processedCount = 0;

      // Log what we're sending to OpenAI
      console.log('Document content length:', documentContent.length);
      console.log('Document content preview:', documentContent.substring(0, 1000) + '...');
      console.log('Template type:', template.type);
      console.log('Number of items to analyze:', template.checker_items.length);

      // Optimize for legal templates - analyze all questions at once
      if (template.type === 'legal') {
        try {
          console.log('Analyzing all legal questions at once...');
          
          // Create requirements list in the format expected by the prompt
          const requirementsList = template.checker_items.map((item: any, i: number) => 
            `${i + 1}. ${item.item_name} | ${item.field_type || 'Yes/No'} | ${item.scoring_logic || 'Yes = 1000, No = 0'}`
          ).join('\n');
          
          console.log('Requirements list being sent to OpenAI:');
          console.log(requirementsList);
          
          // Use the legal prompt template with placeholders
          const legalPromptTemplate = `You are a **MiCAR legal compliance expert**.  
You will analyze a **LEGAL OPINION document** (full or in chunks) against a set of predefined **LEGAL QUESTIONS**.  

Your task is to produce a **STRICT JSON array** (no extra text, no explanations outside JSON).  
Each JSON object must correspond exactly to one row from the \`requirementsList\`, in the same order.  

---

## LEGAL QUESTIONS TEMPLATE (requirementsList)

{{requirementsList}}

---

## DOCUMENT TO ANALYZE

{{documentContent}}

---

## RULES FOR ANALYSIS
1. **Follow order**: Output one JSON object per requirement, in the same order as in the \`requirementsList\`.  
2. **Field type**:  
   - Copy the \`"field_type"\` string **exactly as written** in the \`requirementsList\`.  
   - Then append the chosen answer to it using the format:  
     \`"field_type": "[Exact field type from requirementsList] → Selected: [Answer]"\`.  
     Example:  
     - Template: \`Dropdown: Access to services / Governance only / Investment returns / Other + Text field\`  
     - Answer: \`Investment returns\`  
     - Output: \`"field_type": "Dropdown: Access to services / Governance only / Investment returns / Other + Text field → Selected: Investment returns"\`  
3. **Answer values**:  
   - Must always be one of the options listed in the \`field_type\` from the template.  
   - If "Other" is chosen, format as \`"Other - [short explanation]"\`.  
   - If no relevant information is found in the document:  
     - Use \`"Not sure"\` if it is listed in the \`field_type\` options.  
     - Otherwise use \`"No evidence found"\`.  
4. **Scoring logic**:  
   - Copy the \`"scoring_logic"\` string **exactly as written** in the \`requirementsList\` (no rewriting).  
5. **Risk score**:  
   - If the \`"scoring_logic"\` contains numeric rules, set \`"risk_score"\` to the **exact numeric value** that corresponds to the chosen answer.  
   - If \`"scoring_logic"\` = \`"Not scored"\`, then \`"risk_score"\` must be exactly \`"Not scored"\` (not 0).  
   Example:
   - If scoring_logic = "Yes = 1000, No = 0" and answer = "Yes", then risk_score = 1000
   - If scoring_logic = "No = 5, Not sure = 3, Yes = 0" and answer = "Not sure", then risk_score = 3

6. **Reasoning**: Write a short (1–3 sentences) legal analysis justifying the selected answer.  
7. **Evidence snippets**: Always include verbatim quotes from the document that support the answer. If no relevant evidence is found, output \`["No evidence found"]\`.  
8. **Contradictions**:  
   - If conflicting evidence is found, select the answer that corresponds to the **highest risk score** according to the \`scoring_logic\`.  
   - Clearly mention the contradiction in the \`"reasoning"\`.  
9. **Output format**: Return only a valid JSON array. Do not add any text outside of the JSON.  

---

## JSON OUTPUT FORMAT
[
  {
    "field_type": "[Exact field type from requirementsList] → Selected: [Answer]",
    "scoring_logic": "[Exact scoring logic from requirementsList or 'Not scored']",
    "risk_score": "[Exact score from scoring logic, or 'Not scored']",
    "reasoning": "Short legal reasoning (1–3 sentences)",
    "evidence_snippets": ["Exact quotes from legal opinion or 'No evidence found'"]
  }
]`;
          
          // Replace placeholders with actual content
          const finalPrompt = legalPromptTemplate
            .replace('{{requirementsList}}', requirementsList)
            .replace('{{documentContent}}', documentContent);
          
          // Create pseudo item for the analysis function
          const pseudoItem = { 
            category: 'Legal', 
            item_name: 'All Questions', 
            description: finalPrompt 
          };
          
          const analysis = await analyzeItemWithContent(pseudoItem, '', template.type);
          
          // Extract full legal results array
          const legalResults = (analysis as any).fullLegalResults || [];
          
          // Map each result to corresponding item (new format)
          for (let i = 0; i < template.checker_items.length; i++) {
            const item = template.checker_items[i];
            const legalResult = legalResults[i] || {};
            
            // Parse new format fields
            const fieldType = legalResult.field_type || '';
            const scoringLogic = legalResult.scoring_logic || '';
            
            // Extract selected answer from field_type
            let selectedMatch = fieldType.match(/Selected: \[([^\]]+)\]/);
            if (!selectedMatch) {
              selectedMatch = fieldType.match(/Selected: ([^→]+)$/);
            }
            const selectedAnswer = selectedMatch ? selectedMatch[1].trim() : '';
            
            // Parse risk_score (can be string "Not scored", number, or numeric string)
            let riskScore = 0;
            if (legalResult.risk_score === 'Not scored') {
              riskScore = 0;
            } else if (typeof legalResult.risk_score === 'number') {
              riskScore = legalResult.risk_score;
            } else {
              riskScore = parseInt(legalResult.risk_score) || 0;
            }
            
            // Always recalculate score based on database scoring logic
            const dbScoringLogic = item.scoring_logic || 'Yes = 1000, No = 0';
            if (dbScoringLogic !== 'Not scored' && selectedAnswer) {
              // Clean the selected answer (remove extra text after dash)
              const cleanAnswer = selectedAnswer.split(' - ')[0].trim();
              
              // Try exact match first
              let scoreMatch = dbScoringLogic.match(new RegExp(`${cleanAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(\\d+)`, 'i'));
              
              // Try partial matches for common cases
              if (!scoreMatch) {
                if (cleanAnswer.toLowerCase().includes('other')) {
                  scoreMatch = dbScoringLogic.match(/Other\s*=\s*(\d+)/i);
                } else if (cleanAnswer.toLowerCase().includes('access') || cleanAnswer.toLowerCase().includes('governance')) {
                  scoreMatch = dbScoringLogic.match(/Access\/Governance\s*=\s*(\d+)/i);
                } else if (cleanAnswer.toLowerCase().includes('investment')) {
                  scoreMatch = dbScoringLogic.match(/Investment returns\s*=\s*(\d+)/i);
                } else if (cleanAnswer.toLowerCase().includes('actively')) {
                  scoreMatch = dbScoringLogic.match(/Actively marketing\s*=\s*(\d+)/i);
                } else if (cleanAnswer.toLowerCase().includes('reverse')) {
                  scoreMatch = dbScoringLogic.match(/Reverse\s*=\s*(\d+)/i);
                } else if (cleanAnswer.toLowerCase().includes('planning')) {
                  scoreMatch = dbScoringLogic.match(/Planning\s*=\s*(\d+)/i);
                }
              }
              
              if (scoreMatch) {
                const calculatedScore = parseInt(scoreMatch[1]);
                if (calculatedScore !== riskScore) {
                  console.log(`Score corrected for ${item.item_name}: ${riskScore} → ${calculatedScore} (Answer: "${cleanAnswer}", Logic: "${dbScoringLogic}")`);
                  riskScore = calculatedScore;
                }
              } else {
                console.log(`Could not match answer "${cleanAnswer}" in scoring logic "${dbScoringLogic}" for ${item.item_name}`);
              }
            }
            
            results.push({
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: riskScore > 100 ? 'FOUND' : riskScore > 0 ? 'NEEDS_CLARIFICATION' : 'MISSING',
              coverage_score: riskScore,
              reasoning: legalResult.reasoning || 'No reasoning provided',
              evidence: legalResult.evidence_snippets ? 
                legalResult.evidence_snippets.map((snippet: string) => ({ snippet, page: 1 })) : [],
              // Store legal fields from new format
              field_type: fieldType,
              scoring_logic: scoringLogic,
              selected_answer: selectedAnswer
            });
            processedCount++;
          }
        } catch (error: any) {
          console.error('Failed to analyze legal document:', error);
          
          // Add error result for all items
          for (const item of template.checker_items) {
            results.push({
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: 'NEEDS_CLARIFICATION',
              coverage_score: 0,
              reasoning: `Analysis failed: ${error.message}`,
              evidence: []
            });
          }
        }
      } else {
        // Process each item individually for non-legal templates
        for (const item of template.checker_items) {
          try {
            console.log(`Analyzing item: ${item.item_name}`);
            const analysis = await analyzeItemWithContent(item, documentContent, template.type);

            results.push({
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: analysis.status,
              coverage_score: analysis.coverage_score,
              reasoning: analysis.reasoning,
              evidence: analysis.evidence || []
            });

            processedCount++;
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error: any) {
            console.error(`Failed to analyze item ${item.id}:`, error);
            
            results.push({
              item_id: item.id,
              item_name: item.item_name,
              category: item.category,
              status: 'NEEDS_CLARIFICATION',
              coverage_score: 0,
              reasoning: `Analysis failed: ${error.message}`,
              evidence: []
            });
          }
        }
      }

      // Calculate summary
      const summary = {
        found_items: results.filter(r => r.status === 'FOUND').length,
        clarification_items: results.filter(r => r.status === 'NEEDS_CLARIFICATION').length,
        missing_items: results.filter(r => r.status === 'MISSING').length,
        overall_score: template.type === 'legal' ? 
          Math.round(100 - (results.reduce((sum, r) => sum + r.coverage_score, 0) / results.length)) :
          Math.round(results.reduce((sum, r) => sum + r.coverage_score, 0) / results.length)
      };

      return res.status(200).json({
        success: true,
        checkId: `temp-${Date.now()}`,
        results,
        summary,
        templateName: template.name,
        message: `Analysis completed for ${processedCount}/${template.checker_items.length} items (direct)`
      });
    }

    // Original code for existing checks
    if (!check_id) {
      return res.status(400).json({ error: 'check_id is required for existing check analysis' });
    }


    // Handle existing check analysis
    const { data: checkData, error: checkError } = await serviceClient
      .from('compliance_checks')
      .select('*, checker_templates(*)')
      .eq('id', check_id!)
      .eq('user_id', user.id)
      .single();

    if (checkError || !checkData) {
      return res.status(404).json({ error: 'Check not found' });
    }

    if (checkData.status !== 'ready') {
      return res.status(400).json({ error: 'Check is not ready for analysis' });
    }

    const actualCheckId = check_id!;

    // Get checklist items for this template
    const { data: items, error: itemsError } = await serviceClient
      .from('checker_items')
      .select('*')
      .eq('template_id', checkData.template_id)
      .order('sort_order');

    if (itemsError || !items) {
      throw new Error('Failed to load checklist items');
    }

    // Get ALL chunks once for the entire analysis
    const { data: allChunks } = await serviceClient
      .from('compliance_chunks')
      .select('content, page')
      .eq('check_id', actualCheckId)
      .order('page');

    if (!allChunks || allChunks.length === 0) {
      return res.status(400).json({ error: 'No document chunks found for analysis' });
    }

    // Create documentContent ONCE for all items
    const documentContent = allChunks.map((chunk, i) => 
      `[Excerpt ${i + 1}${chunk.page ? ` - Page ${chunk.page}` : ''}]\n${chunk.content}`
    ).join('\n\n');

    console.log(`Using ${allChunks.length} chunks for analysis (${documentContent.length} chars)`);

    const results = [];
    let processedCount = 0;

    // Process each item with the same documentContent
    for (const item of items) {
      try {
        // Analyze with GPT-4 using all chunks
        const analysis = await analyzeItemWithContent(item, documentContent, checkData.checker_templates.type);

        // Save result to database
        const { data: resultData, error: resultError } = await serviceClient
          .from('check_results')
          .insert({
            check_id: actualCheckId,
            item_id: item.id,
            status: analysis.status,
            coverage_score: analysis.coverage_score,
            reasoning: analysis.reasoning,
          })
          .select()
          .single();

        if (resultError) {
          throw new Error(`Failed to save result: ${resultError.message}`);
        }

        // Save evidence
        if (analysis.evidence.length > 0) {
          const evidenceData = analysis.evidence.map(evidence => ({
            result_id: resultData.id,
            page: evidence.page,
            url: evidence.url,
            snippet: evidence.snippet,
          }));

          const { error: evidenceError } = await serviceClient
            .from('compliance_evidences')
            .insert(evidenceData);

          if (evidenceError) {
            console.error('Failed to save evidence:', evidenceError);
          }
        }

        results.push({
          item_id: item.id,
          item_name: item.item_name,
          status: analysis.status,
          coverage_score: analysis.coverage_score,
        });

        processedCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`Failed to analyze item ${item.id}:`, error);
        
        // Save error result
        await serviceClient
          .from('check_results')
          .insert({
            check_id: actualCheckId,
            item_id: item.id,
            status: 'NEEDS_CLARIFICATION',
            coverage_score: 0,
            reasoning: `Analysis failed: ${error.message}`,
          });

        results.push({
          item_id: item.id,
          item_name: item.item_name,
          status: 'NEEDS_CLARIFICATION',
          coverage_score: 0,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Analysis completed for ${processedCount}/${items.length} items`,
      results: results,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
    });
  }
}