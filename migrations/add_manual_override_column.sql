-- Add manually_overridden column to compliance_results table
ALTER TABLE compliance_results 
ADD COLUMN manually_overridden BOOLEAN DEFAULT FALSE;