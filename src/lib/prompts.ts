// Hybrid prompt management system (memory + database)
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  lastModified: string;
  version: number;
}

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {

  REGENERATE_ANALYSIS: {
    id: 'REGENERATE_ANALYSIS',
    name: 'Regenerate Non-Found Items',
    description: 'Prompt for re-analyzing items that were not found in initial analysis',
    template: `You are a MiCA regulation compliance expert analyzing crypto project documentation. These requirements were previously marked as NOT FOUND or NEEDS CLARIFICATION. Please re-analyze them objectively with this expanded document content.

REQUIREMENTS TO RE-ANALYZE:
{{itemsList}}

EXPANDED DOCUMENT CONTENT:
{{fullContent}}

For each requirement, search the document thoroughly for:
1. Direct statements addressing the requirement
2. Related information using synonyms or alternative terminology
3. Implicit information that satisfies the requirement
4. Contextual details that demonstrate compliance

EVALUATION CRITERIA:
- FOUND (80-100): Requirement is clearly addressed with sufficient detail
- NEEDS_CLARIFICATION (40-79): Partial information present but lacks completeness or clarity
- MISSING (0-39): No relevant information found

Provide objective analysis based solely on document content. Include exact quotes as evidence when available.

Respond with JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Clear explanation of findings",
    "evidence_snippets": ["exact quotes from document"]
  }
]`,
    variables: ['itemsList', 'fullContent'],
    lastModified: new Date().toISOString(),
    version: 1
  },

  WHITEPAPER_ANALYSIS: {
    id: 'WHITEPAPER_ANALYSIS',
    name: 'Whitepaper Analysis',
    description: 'Specialized prompt for analyzing crypto project whitepapers against MiCA requirements',
    template: `You are a MiCA regulation compliance expert analyzing a crypto project WHITEPAPER. This document should contain technical, economic, and project information about a crypto asset offering.

WHITEPAPER REQUIREMENTS TO ANALYZE:
{{requirementsList}}

WHITEPAPER DOCUMENT CONTENT:
{{documentContent}}

For each MiCA whitepaper requirement, determine the appropriate status:

1. **FOUND**: Information is clearly present and adequately addresses the requirement
2. **NEEDS_CLARIFICATION**: Some relevant information found but incomplete or unclear  
3. **MISSING**: No relevant information found but the requirement applies to this project

EVALUATION CRITERIA FOR WHITEPAPERS:
- FOUND (100): Requirement is clearly addressed with sufficient detail in the whitepaper
- NEEDS_CLARIFICATION (50): Partial information present but lacks completeness or clarity
- MISSING (0): No relevant information found but requirement applies to this crypto project

Look for whitepaper-typical information: tokenomics, project roadmap, technical architecture, team information, use cases, token distribution, legal framework like LEI (Legal Entity Identifier),Information about the offeror or the person seeking admission to trading Information about the crypto-asset project		Information about the offer to the public of crypto-assets or their admission to trading		Information about the crypto-assets		Information on the rights and obligations attached to the crypto-assets		Information on the underlying technology		Information on the risks etc.

Respond with JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Clear explanation of findings",
    "evidence_snippets": ["exact quotes from whitepaper document"]
  }
]`,
    variables: ['requirementsList', 'documentContent'],
    lastModified: new Date().toISOString(),
    version: 1
  }
};

export async function getPrompt(promptId: string): Promise<PromptTemplate | null> {
  try {
    // Try database first
    const { data: dbPrompt } = await serviceClient
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .eq('is_active', true)
      .single();
    
    if (dbPrompt) {
      return {
        id: dbPrompt.id,
        name: dbPrompt.name,
        description: dbPrompt.description || '',
        template: dbPrompt.template,
        variables: dbPrompt.variables || [],
        lastModified: dbPrompt.updated_at,
        version: dbPrompt.version
      };
    }
  } catch (error) {
    console.log('Database prompt not found, using fallback:', promptId);
  }
  
  // Fallback to memory
  return PROMPT_TEMPLATES[promptId] || null;
}

export async function renderPrompt(promptId: string, variables: Record<string, string>): Promise<string> {
  const prompt = await getPrompt(promptId);
  if (!prompt) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  let rendered = prompt.template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return rendered;
}

export async function updatePrompt(promptId: string, newTemplate: string): Promise<boolean> {
  try {
    // Update in database
    const { error } = await serviceClient
      .from('prompts')
      .upsert({
        id: promptId,
        template: newTemplate,
        updated_at: new Date().toISOString(),
        version: 1 // Will be incremented by trigger
      });
    
    if (!error) {
      return true;
    }
  } catch (error) {
    console.error('Failed to update prompt in database:', error);
  }
  
  // Fallback to memory update
  if (!PROMPT_TEMPLATES[promptId]) {
    return false;
  }

  PROMPT_TEMPLATES[promptId].template = newTemplate;
  PROMPT_TEMPLATES[promptId].lastModified = new Date().toISOString();
  PROMPT_TEMPLATES[promptId].version += 1;
  
  return true;
}

export async function getAllPrompts(): Promise<PromptTemplate[]> {
  try {
    // Get from database first
    const { data: dbPrompts } = await serviceClient
      .from('prompts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (dbPrompts && dbPrompts.length > 0) {
      return dbPrompts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        template: p.template,
        variables: p.variables || [],
        lastModified: p.updated_at,
        version: p.version
      }));
    }
  } catch (error) {
    console.log('Database prompts not available, using fallback');
  }
  
  // Fallback to memory
  return Object.values(PROMPT_TEMPLATES);
}