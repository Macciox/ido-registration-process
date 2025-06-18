-- Create index on project_id
CREATE INDEX IF NOT EXISTS project_fields_project_id_idx ON project_fields(project_id);

-- Create index on created_at
CREATE INDEX IF NOT EXISTS project_fields_created_at_idx ON project_fields(created_at);