-- Function to send invitation email for admin whitelist
CREATE OR REPLACE FUNCTION send_admin_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Use Supabase's built-in invitation system
  PERFORM extensions.http_request(
    'POST',
    current_setting('supabase.api_url') || '/auth/v1/admin/users',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || current_setting('supabase.service_role_key')),
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'email', NEW.email,
      'email_confirm', true,
      'user_metadata', json_build_object('role', 'admin')
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send invitation email for project owners
CREATE OR REPLACE FUNCTION send_project_owner_invitation()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  -- Get project name
  SELECT name INTO project_name 
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- Use Supabase's built-in invitation system
  PERFORM extensions.http_request(
    'POST',
    current_setting('supabase.api_url') || '/auth/v1/admin/users',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || current_setting('supabase.service_role_key')),
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'email', NEW.email,
      'email_confirm', true,
      'user_metadata', json_build_object(
        'role', 'project_owner',
        'project_name', COALESCE(project_name, 'Unknown Project')
      )
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_admin_whitelist_insert ON admin_whitelist;
CREATE TRIGGER on_admin_whitelist_insert
  AFTER INSERT ON admin_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION send_admin_invitation();

DROP TRIGGER IF EXISTS on_project_owner_insert ON project_owners;
CREATE TRIGGER on_project_owner_insert
  AFTER INSERT ON project_owners
  FOR EACH ROW
  EXECUTE FUNCTION send_project_owner_invitation();