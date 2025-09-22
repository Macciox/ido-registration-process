-- Add privacy fields to project_documents table
ALTER TABLE project_documents 
ADD COLUMN visible_to_owners BOOLEAN DEFAULT false,
ADD COLUMN owners_can_upload BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN project_documents.visible_to_owners IS 'Whether project owners can see this document';
COMMENT ON COLUMN project_documents.owners_can_upload IS 'Whether project owners can upload documents to this project';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS project_documents_visible_to_owners_idx ON project_documents(visible_to_owners);
CREATE INDEX IF NOT EXISTS project_documents_owners_can_upload_idx ON project_documents(owners_can_upload);