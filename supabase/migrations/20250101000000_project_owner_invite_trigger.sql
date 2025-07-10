-- Function to send invitation email when project owner is added
CREATE OR REPLACE FUNCTION send_project_owner_invitation()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  -- Get project name
  SELECT name INTO project_name 
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- Send invitation email using Supabase Auth
  PERFORM auth.send_invitation_email(
    NEW.email,
    jsonb_build_object(
      'role', 'project_owner',
      'project_name', COALESCE(project_name, 'Unknown Project')
    ),
    COALESCE(current_setting('app.base_url', true), 'http://localhost:3000') || '/dashboard'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on project_owners table
DROP TRIGGER IF EXISTS on_project_owner_added ON project_owners;
CREATE TRIGGER on_project_owner_added
  AFTER INSERT ON project_owners
  FOR EACH ROW
  EXECUTE FUNCTION send_project_owner_invitation();