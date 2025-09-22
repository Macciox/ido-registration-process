-- Add more granular permissions to project_documents
ALTER TABLE project_documents 
ADD COLUMN IF NOT EXISTS owners_can_view boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS owners_can_edit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS owners_can_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;