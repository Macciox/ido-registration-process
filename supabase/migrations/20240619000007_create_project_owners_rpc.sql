-- Create a function to create the project_owners table
CREATE OR REPLACE FUNCTION create_project_owners_table()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'project_owners'
  ) THEN
    -- Create the table
    CREATE TABLE project_owners (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX project_owners_project_id_idx ON project_owners(project_id);
    CREATE INDEX project_owners_email_idx ON project_owners(email);
    CREATE INDEX project_owners_status_idx ON project_owners(status);
    
    -- Add foreign key
    ALTER TABLE project_owners 
    ADD CONSTRAINT project_owners_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;