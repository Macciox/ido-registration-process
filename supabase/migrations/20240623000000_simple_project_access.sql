-- Create a simple function to check if a user has access to a project
CREATE OR REPLACE FUNCTION has_project_access(project_id UUID, user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE email = user_email AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is the primary owner
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id AND owner_email = user_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is in project_owners table
  RETURN EXISTS (
    SELECT 1 FROM project_owners
    WHERE project_id = project_id AND email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to check project access on user registration
CREATE OR REPLACE FUNCTION check_project_access_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user's email is in project_owners table
  UPDATE project_owners
  SET status = 'verified'
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_check_projects ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_check_projects
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION check_project_access_on_signup();