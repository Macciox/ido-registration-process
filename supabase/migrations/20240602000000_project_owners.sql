-- Create project_owners table
CREATE TABLE project_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create unique constraint to prevent duplicate owners
ALTER TABLE project_owners ADD CONSTRAINT unique_project_owner UNIQUE (project_id, email);

-- Enable RLS
ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

-- Only admins can view project owners
CREATE POLICY "Admin users can view project owners"
  ON project_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert project owners
CREATE POLICY "Admin users can insert project owners"
  ON project_owners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete project owners
CREATE POLICY "Admin users can delete project owners"
  ON project_owners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX project_owners_project_id_idx ON project_owners (project_id);
CREATE INDEX project_owners_email_idx ON project_owners (email);

-- Create function to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION create_project_owners_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
    );

    -- Create unique constraint
    ALTER TABLE project_owners ADD CONSTRAINT unique_project_owner UNIQUE (project_id, email);

    -- Enable RLS
    ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Admin users can view project owners"
      ON project_owners FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY "Admin users can insert project owners"
      ON project_owners FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY "Admin users can delete project owners"
      ON project_owners FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    -- Create indexes
    CREATE INDEX project_owners_project_id_idx ON project_owners (project_id);
    CREATE INDEX project_owners_email_idx ON project_owners (email);
  END IF;
END;
$$;