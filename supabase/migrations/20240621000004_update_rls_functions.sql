-- Update is_project_owner function to use owner_id instead of owner_email
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

  -- Check if user is in project_owners table
  RETURN EXISTS (
    SELECT 1 FROM project_owners
    WHERE project_id = $1 AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;