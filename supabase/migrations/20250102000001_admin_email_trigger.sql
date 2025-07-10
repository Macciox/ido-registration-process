-- Function to send invitation email when admin is added to whitelist
CREATE OR REPLACE FUNCTION send_admin_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
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
      'user_metadata', jsonb_build_object('invited_as', 'admin')
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for admin whitelist
DROP TRIGGER IF EXISTS on_admin_whitelist_added ON admin_whitelist;
CREATE TRIGGER on_admin_whitelist_added
  AFTER INSERT ON admin_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION send_admin_invitation_email();