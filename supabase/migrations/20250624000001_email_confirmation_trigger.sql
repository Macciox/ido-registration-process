-- Function to handle email confirmation
CREATE OR REPLACE FUNCTION handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email_confirmed_at was just set (changed from null to a timestamp)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Check if user is in admin whitelist
    IF EXISTS (SELECT 1 FROM admin_whitelist WHERE email = NEW.email) THEN
      -- Update admin whitelist status
      UPDATE admin_whitelist 
      SET status = 'registered' 
      WHERE email = NEW.email;
      
      -- Create admin profile
      INSERT INTO profiles (id, email, role)
      VALUES (NEW.id, NEW.email, 'admin')
      ON CONFLICT (id) DO NOTHING;
      
    -- Check if user is in projectowner whitelist
    ELSIF EXISTS (SELECT 1 FROM projectowner_whitelist WHERE email = NEW.email) THEN
      -- Update projectowner whitelist status
      UPDATE projectowner_whitelist 
      SET status = 'registered' 
      WHERE email = NEW.email;
      
      -- Create project owner profile
      INSERT INTO profiles (id, email, role)
      VALUES (NEW.id, NEW.email, 'project_owner')
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_email_confirmation();