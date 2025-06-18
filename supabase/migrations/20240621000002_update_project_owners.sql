-- Add owner_id column to project_owners table
ALTER TABLE project_owners ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update owner_id based on email
UPDATE project_owners po
SET owner_id = profiles.id
FROM profiles
WHERE po.email = profiles.email;

-- Create index on owner_id
CREATE INDEX IF NOT EXISTS project_owners_owner_id_idx ON project_owners(owner_id);

-- Create index on project_id if not exists
CREATE INDEX IF NOT EXISTS project_owners_project_id_idx ON project_owners(project_id);

-- Create index on email if not exists
CREATE INDEX IF NOT EXISTS project_owners_email_idx ON project_owners(email);

-- Create index on created_at
CREATE INDEX IF NOT EXISTS project_owners_created_at_idx ON project_owners(created_at);