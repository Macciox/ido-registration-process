-- Add NOT_APPLICABLE support to compliance_checks table
ALTER TABLE compliance_checks 
ADD COLUMN IF NOT EXISTS not_applicable_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS applicable_items INTEGER DEFAULT 0;

-- Update existing records to calculate applicable_items
UPDATE compliance_checks 
SET applicable_items = COALESCE(found_items, 0) + COALESCE(clarification_items, 0) + COALESCE(missing_items, 0)
WHERE applicable_items = 0 OR applicable_items IS NULL;