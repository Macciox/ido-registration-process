-- Add project_id to compliance_checks table
ALTER TABLE compliance_checks 
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add project_id to saved_analyses table
ALTER TABLE saved_analyses 
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS compliance_checks_project_id_idx ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS saved_analyses_project_id_idx ON saved_analyses(project_id);

-- Add comment
COMMENT ON COLUMN compliance_checks.project_id IS 'Optional project association for compliance checks';
COMMENT ON COLUMN saved_analyses.project_id IS 'Optional project association for saved analyses';