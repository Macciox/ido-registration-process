-- Create project_owners table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS project_owners_project_id_idx ON project_owners(project_id);
CREATE INDEX IF NOT EXISTS project_owners_email_idx ON project_owners(email);
CREATE INDEX IF NOT EXISTS project_owners_status_idx ON project_owners(status);

-- Add foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_owners_project_id_fkey'
  ) THEN
    ALTER TABLE project_owners 
    ADD CONSTRAINT project_owners_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error adding foreign key: %', SQLERRM;
END $$;