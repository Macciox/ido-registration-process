-- Add owner_id column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update owner_id based on owner_email
UPDATE projects p
SET owner_id = profiles.id
FROM profiles
WHERE p.owner_email = profiles.email;

-- Create index on owner_id
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);

-- Create index on created_at
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at);