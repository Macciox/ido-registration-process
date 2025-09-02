-- Add columns for persistent analysis
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0;
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS found_items INTEGER DEFAULT 0;
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS clarification_items INTEGER DEFAULT 0;
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS missing_items INTEGER DEFAULT 0;
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add unique constraint to prevent duplicate analyses
ALTER TABLE compliance_checks ADD CONSTRAINT unique_document_template UNIQUE (document_id, template_id);