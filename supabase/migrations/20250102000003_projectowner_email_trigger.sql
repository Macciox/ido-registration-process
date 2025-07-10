-- Function to send invitation email when project owner is added to whitelist
CREATE OR REPLACE FUNCTION send_projectowner_invitation_email()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  -- Get project name
  SELECT name INTO project_name 
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- Send invitation email using Supabase Auth API
  PERFORM net.http_post(
    url := current_setting('supabase.api_url') || '/auth/v1/admin/users',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'email_confirm', true,
      'user_metadata', jsonb_build_object(
        'invited_as', 'project_owner',
        'project_name', COALESCE(project_name, 'Unknown Project'),
        'project_id', NEW.project_id::text
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for projectowner whitelist
DROP TRIGGER IF EXISTS on_projectowner_whitelist_added ON projectowner_whitelist;
CREATE TRIGGER on_projectowner_whitelist_added
  AFTER INSERT ON projectowner_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION send_projectowner_invitation_email();