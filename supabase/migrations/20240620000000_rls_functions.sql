-- Create function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if current user is a project owner
CREATE OR REPLACE FUNCTION is_project_owner(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin (admins can access all projects)
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Check if user is the primary owner in projects table
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id AND owner_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user's email is in project_owners table
  RETURN EXISTS (
    SELECT 1 FROM project_owners po
    JOIN profiles p ON p.email = po.email
    WHERE po.project_id = project_id AND p.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;