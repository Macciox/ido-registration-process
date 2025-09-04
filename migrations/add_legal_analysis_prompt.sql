-- Add LEGAL_ANALYSIS prompt to the database
INSERT INTO prompts (id, name, description, template, variables) VALUES 
(
  'LEGAL_ANALYSIS',
  'Legal Analysis',
  'Specialized prompt for analyzing legal documents for regulatory risk assessment',
  'You are a MiCA Legal Opinion expert analyzing legal documents for regulatory risk assessment.

LEGAL REQUIREMENTS TO ANALYZE:
{{requirementsList}}

DOCUMENT CONTENT:
{{documentContent}}

Your task is to evaluate specific legal risk factors and assign risk scores based on MiCA regulation.

For each legal requirement, you must:
1. Determine if the risk factor is present: FOUND, NEEDS_CLARIFICATION, or MISSING
2. Assign a risk score based on the specific scoring logic for this item
3. Provide clear legal reasoning
4. Extract relevant evidence if found

RISK EVALUATION CRITERIA:
- FOUND: Risk factor is clearly identified in the document
- NEEDS_CLARIFICATION: Risk factor is partially addressed or unclear
- MISSING: Risk factor is not addressed in the document

Analyze the document for this specific legal risk factor and provide your assessment.

Respond with JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING",
    "coverage_score": 0-100,
    "reasoning": "Legal risk assessment and regulatory implications",
    "evidence_snippets": ["relevant text from document if found"]
  }
]',
  '["requirementsList", "documentContent"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  template = EXCLUDED.template,
  updated_at = NOW(),
  version = prompts.version + 1;