-- Update prompt names and remove unused ones
UPDATE prompts SET 
  name = 'MiCA Whitepaper Analysis',
  description = 'Specialized prompt for analyzing crypto project whitepapers against MiCA requirements'
WHERE id = 'WHITEPAPER_ANALYSIS';

UPDATE prompts SET 
  name = 'Legal Opinion Analysis',
  description = 'Specialized prompt for analyzing legal documents for regulatory risk assessment'
WHERE id = 'LEGAL_ANALYSIS';

UPDATE prompts SET 
  name = 'Regenerate Analysis',
  description = 'Prompt for re-analyzing items that were not found in initial analysis'
WHERE id = 'REGENERATE_ANALYSIS';

-- Remove unused COMPLIANCE_ANALYSIS prompt
DELETE FROM prompts WHERE id = 'COMPLIANCE_ANALYSIS';