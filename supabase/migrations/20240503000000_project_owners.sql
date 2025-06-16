-- Create project_owners table for many-to-many relationship
CREATE TABLE project_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add index for faster lookups
CREATE INDEX idx_project_owners_email ON project_owners(email);
CREATE INDEX idx_project_owners_project_id ON project_owners(project_id);

-- Add RLS policies
ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

-- Admin users can manage project owners
CREATE POLICY "Admin users can view all project owners"
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

-- Project owners can view their own projects
CREATE POLICY "Project owners can view their own project owners"
  ON project_owners FOR SELECT
  USING (
    email = (
      SELECT email FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Update the project owners policy to use the new table
CREATE OR REPLACE POLICY "Project owners can view their own projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = projects.id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );