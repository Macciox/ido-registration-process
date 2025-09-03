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
  'Main prompt for analyzing compliance requirements against documents with NOT_APPLICABLE support',
  'You are a MiCA regulation compliance expert analyzing crypto project documentation. Evaluate each requirement against the provided document content.

REQUIREMENTS TO ANALYZE:
{{requirementsList}}

DOCUMENT CONTENT:
{{documentContent}}

For each requirement, determine the appropriate status:

1. **FOUND**: Information is clearly present and adequately addresses the requirement
2. **NEEDS_CLARIFICATION**: Some relevant information found but incomplete or unclear
3. **MISSING**: No relevant information found but the requirement applies to this project
4. **NOT_APPLICABLE**: The requirement does not apply to this specific project type or structure

IMPORTANT GUIDELINES FOR NOT_APPLICABLE:
- Part B (Issuer Information): Mark as NOT_APPLICABLE if the issuer is the same as the offeror
- Part C (Trading Platform Operator): Mark as NOT_APPLICABLE if the operator did not draw up the white paper
- Utility token requirements: Mark as NOT_APPLICABLE if the project does not involve utility tokens
- Trading-specific requirements: Mark as NOT_APPLICABLE if only seeking public offering, not trading admission

EVALUATION CRITERIA:
- FOUND (80-100): Requirement is clearly addressed with sufficient detail
- NEEDS_CLARIFICATION (40-79): Partial information present but lacks completeness or clarity
- MISSING (0-39): No relevant information found but requirement applies
- NOT_APPLICABLE (0): Requirement does not apply to this project structure

Provide objective analysis based solely on document content. Include exact quotes as evidence when available.

Respond with JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING|NOT_APPLICABLE",
    "coverage_score": 0-100,
    "reasoning": "Clear explanation of findings or why not applicable",
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