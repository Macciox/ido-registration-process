-- Add status and is_primary fields to project_owners table
ALTER TABLE project_owners 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;

-- Add function to send invitation email
CREATE OR REPLACE FUNCTION send_project_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- This would typically integrate with your email service
  -- For now, we'll just log the invitation
  RAISE NOTICE 'Sending invitation email to % for project %', NEW.email, NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sending invitation emails
CREATE TRIGGER on_project_owner_created
  AFTER INSERT ON project_owners
  FOR EACH ROW
  EXECUTE FUNCTION send_project_invitation();

-- Update RLS policies for project owners
DROP POLICY IF EXISTS "Admin users can view project owners" ON project_owners;
DROP POLICY IF EXISTS "Admin users can insert project owners" ON project_owners;
DROP POLICY IF EXISTS "Admin users can delete project owners" ON project_owners;

-- Allow project owners to view their project's owners
CREATE POLICY "Users can view project owners"
  ON project_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners po
      WHERE po.project_id = project_owners.project_id
      AND po.email = (SELECT email FROM profiles WHERE id = auth.uid())
      AND po.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow primary project owners to insert new owners
CREATE POLICY "Primary owners can insert project owners"
  ON project_owners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_owners po
      WHERE po.project_id = NEW.project_id
      AND po.email = (SELECT email FROM profiles WHERE id = auth.uid())
      AND po.is_primary = true
      AND po.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow primary project owners to delete owners
CREATE POLICY "Primary owners can delete project owners"
  ON project_owners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners po
      WHERE po.project_id = OLD.project_id
      AND po.email = (SELECT email FROM profiles WHERE id = auth.uid())
      AND po.is_primary = true
      AND po.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update projects table policies to allow access based on project_owners table
DROP POLICY IF EXISTS "Project owners can view their own projects" ON projects;

CREATE POLICY "Project owners can view their own projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners po
      WHERE po.project_id = id
      AND po.email = (SELECT email FROM profiles WHERE id = auth.uid())
      AND po.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );