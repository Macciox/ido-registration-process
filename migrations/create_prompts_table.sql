-- Create prompts table for customizable AI prompts
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Insert default prompts (these will override hardcoded ones)
INSERT INTO prompts (id, name, description, template, variables) VALUES 
(
  'COMPLIANCE_ANALYSIS',
  'MiCA Compliance Analysis',
  'Main prompt for analyzing compliance requirements against documents',
  'You are a MiCA regulation compliance expert analyzing crypto project documentation. Evaluate each requirement against the provided document content.

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
]',
  '["requirementsList", "documentContent"]'::jsonb
),
(
  'REGENERATE_ANALYSIS',
  'Regenerate Non-Found Items',
  'Prompt for re-analyzing items that were not found in initial analysis',
  'You are a MiCA regulation compliance expert analyzing crypto project documentation. These requirements were previously marked as NOT FOUND or NEEDS CLARIFICATION. Please re-analyze them objectively with this expanded document content.

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
]',
  '["itemsList", "fullContent"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;