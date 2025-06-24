-- Add is_primary field to project_owners table
ALTER TABLE project_owners 
ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;

-- Update existing records: set first email as primary for each project
UPDATE project_owners 
SET is_primary = TRUE 
WHERE id IN (
  SELECT DISTINCT ON (project_id) id 
  FROM project_owners 
  ORDER BY project_id, created_at ASC
);