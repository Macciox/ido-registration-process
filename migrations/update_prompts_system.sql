-- Clear existing prompts and create template-specific ones
DELETE FROM prompts;

-- Whitepaper Analysis Prompt
INSERT INTO prompts (id, name, description, template, variables) VALUES 
(
  'WHITEPAPER_ANALYSIS',
  'MiCA Whitepaper Analysis',
  'Specialized prompt for analyzing crypto project whitepapers against MiCA requirements',
  'You are a MiCA regulation compliance expert analyzing a crypto project WHITEPAPER. This document should contain technical, economic, and project information about a crypto asset offering.

WHITEPAPER REQUIREMENTS TO ANALYZE:
{{requirementsList}}

WHITEPAPER DOCUMENT CONTENT:
{{documentContent}}

For each MiCA whitepaper requirement, determine the appropriate status:

1. **FOUND**: Information is clearly present and adequately addresses the requirement
2. **NEEDS_CLARIFICATION**: Some relevant information found but incomplete or unclear  
3. **MISSING**: No relevant information found but the requirement applies to this project
4. **NOT_APPLICABLE**: The requirement does not apply to this specific project structure

WHITEPAPER-SPECIFIC GUIDELINES FOR NOT_APPLICABLE:
- Part B (Issuer Information): Mark as NOT_APPLICABLE if the issuer is the same as the offeror
- Part C (Trading Platform Operator): Mark as NOT_APPLICABLE if the operator did not draw up the whitepaper
- Utility token requirements: Mark as NOT_APPLICABLE if the project does not involve utility tokens
- Trading admission requirements: Mark as NOT_APPLICABLE if only seeking public offering, not trading admission
- Parent company info: Mark as NOT_APPLICABLE if no parent company exists

EVALUATION CRITERIA FOR WHITEPAPERS:
- FOUND (80-100): Requirement is clearly addressed with sufficient detail in the whitepaper
- NEEDS_CLARIFICATION (40-79): Partial information present but lacks completeness or clarity
- MISSING (0-39): No relevant information found but requirement applies to this crypto project
- NOT_APPLICABLE (0): Requirement does not apply to this project structure

Look for whitepaper-typical information: tokenomics, project roadmap, technical architecture, team information, use cases, token distribution, etc.

Respond with JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING|NOT_APPLICABLE",
    "coverage_score": 0-100,
    "reasoning": "Clear explanation of findings or why not applicable to this whitepaper",
    "evidence_snippets": ["exact quotes from whitepaper document"]
  }
]',
  '["requirementsList", "documentContent"]'::jsonb
),
(
  'LEGAL_OPINION_ANALYSIS', 
  'Legal Opinion Analysis',
  'Specialized prompt for analyzing legal opinion documents with risk-based scoring',
  'You are a legal compliance expert analyzing a LEGAL OPINION document for a crypto project. This document should contain legal assessments about MiCA compliance and regulatory risks.

LEGAL QUESTIONS TO ANALYZE:
{{requirementsList}}

LEGAL DOCUMENT CONTENT:
{{documentContent}}

For each legal question, you must determine the answer based on the legal opinion content and assign the EXACT risk score according to the scoring logic provided in each question description.

IMPORTANT: This is a RISK-BASED scoring system where:
- Higher scores = Higher regulatory risk
- Lower scores = Lower regulatory risk
- Each question has specific scoring rules (e.g., "Yes = 1000, No = 0")

For each question:
1. **ANSWER**: Determine the most accurate answer based on the legal opinion (Yes/No/Not sure/Other/etc.)
2. **RISK_SCORE**: Use the EXACT score from the question description for that answer
3. **REASONING**: Explain your legal analysis and why you chose this answer
4. **EVIDENCE**: Provide exact quotes from the legal opinion that support your answer

SCORING EXAMPLES:
- "Does the token grant rights like shares?" → If legal opinion says "No dividend rights" → Answer: "No" → Risk Score: 0
- "Is token pegged to EUR?" → If legal opinion says "USD-pegged stablecoin" → Answer: "No" → Risk Score: 0
- "Is issuer registered?" → If legal opinion says "Unregistered entity" → Answer: "No" → Risk Score: 1000

Respond with JSON array (one object per question in exact order):
[
  {
    "answer": "Yes|No|Not sure|Other|Planning to|etc",
    "risk_score": 0-1000,
    "reasoning": "Legal analysis explaining the answer based on the opinion",
    "evidence_snippets": ["exact quotes from legal opinion supporting this answer"]
  }
]',
  '["requirementsList", "documentContent"]'::jsonb
),
(
  'REGENERATE_ANALYSIS',
  'Regenerate Non-Found Items',
  'Re-analysis of items that were not found in initial analysis (template-agnostic)',
  'You are a compliance expert re-analyzing requirements that were previously marked as NOT FOUND or NEEDS CLARIFICATION. Use the expanded document content to conduct a more thorough analysis.

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
- MISSING (0-39): No relevant information found but requirement applies
- NOT_APPLICABLE (0): Requirement does not apply to this project structure

Provide objective analysis based solely on document content. Include exact quotes as evidence when available.

Respond with JSON array (one object per requirement in exact order):
[
  {
    "status": "FOUND|NEEDS_CLARIFICATION|MISSING|NOT_APPLICABLE",
    "coverage_score": 0-100,
    "reasoning": "Clear explanation of findings",
    "evidence_snippets": ["exact quotes from document"]
  }
]',
  '["itemsList", "fullContent"]'::jsonb
);