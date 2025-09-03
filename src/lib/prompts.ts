// Centralized prompt management system

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
  COMPLIANCE_ANALYSIS: {
    id: 'COMPLIANCE_ANALYSIS',
    name: 'MiCA Compliance Analysis',
    description: 'Main prompt for analyzing compliance requirements against documents',
    template: `You are a MiCA regulation compliance expert analyzing crypto project documentation. Evaluate each requirement against the provided document content.

REQUIREMENTS TO ANALYZE:
{{requirementsList}}

DOCUMENT CONTENT:
{{documentContent}}

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
    variables: ['requirementsList', 'documentContent'],
    lastModified: new Date().toISOString(),
    version: 1
  },

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
  }
};

export function getPrompt(promptId: string): PromptTemplate | null {
  return PROMPT_TEMPLATES[promptId] || null;
}

export function renderPrompt(promptId: string, variables: Record<string, string>): string {
  const prompt = getPrompt(promptId);
  if (!prompt) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  let rendered = prompt.template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return rendered;
}

export function updatePrompt(promptId: string, newTemplate: string): boolean {
  if (!PROMPT_TEMPLATES[promptId]) {
    return false;
  }

  PROMPT_TEMPLATES[promptId].template = newTemplate;
  PROMPT_TEMPLATES[promptId].lastModified = new Date().toISOString();
  PROMPT_TEMPLATES[promptId].version += 1;
  
  return true;
}

export function getAllPrompts(): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES);
}