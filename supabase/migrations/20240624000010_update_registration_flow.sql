-- Create or replace the handle_new_user function to correctly handle registration flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_entry RECORD;
  project_owner_entry RECORD;
  user_role TEXT := 'project_owner'; -- Default role
BEGIN
  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    -- User already exists, no need to create a new profile
    RETURN NEW;
  END IF;

  -- Check if the email is in the admin_whitelist
  BEGIN
    SELECT * INTO admin_entry 
    FROM admin_whitelist 
    WHERE email = NEW.email;

    -- If email is in admin whitelist, set role to admin
    IF admin_entry.id IS NOT NULL THEN
      user_role := 'admin';
      RAISE NOTICE 'User % found in admin whitelist, setting role to admin', NEW.email;
      
      -- Update the status to pending_verification
      BEGIN
        UPDATE admin_whitelist
        SET status = 'pending_verification'
        WHERE id = admin_entry.id;
      EXCEPTION
        WHEN undefined_column THEN
          NULL; -- Ignore if status column doesn't exist
      END;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- admin_whitelist table doesn't exist, continue with default role
      NULL;
  END;

  -- If not admin, check if the email is in project_owners table
  IF user_role = 'project_owner' THEN
    BEGIN
      SELECT * INTO project_owner_entry 
      FROM project_owners 
      WHERE email = NEW.email 
      LIMIT 1;

      -- If email is in project_owners, confirm it's a project_owner
      IF project_owner_entry.id IS NOT NULL THEN
        user_role := 'project_owner';
        
        -- Update the status to pending_verification
        UPDATE project_owners
        SET status = 'pending_verification'
        WHERE id = project_owner_entry.id;
        
        RAISE NOTICE 'User % found in project_owners, confirming project_owner role', NEW.email;
      ELSE
        -- If not in any whitelist, raise an exception
        RAISE EXCEPTION 'Email % is not in any whitelist', NEW.email;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        -- project_owners table doesn't exist, raise exception
        RAISE EXCEPTION 'Email % is not in any whitelist', NEW.email;
    END;
  END IF;

  -- Create a new profile for the user with the determined role
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle email verification
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an email verification update
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Update admin_whitelist status to verified if exists
    BEGIN
      UPDATE admin_whitelist
      SET status = 'verified'
      WHERE email = NEW.email AND status = 'pending_verification';
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
      WHEN undefined_column THEN
        NULL;
    END;
    
    -- Update project_owners status to verified if exists
    BEGIN
      UPDATE project_owners
      SET status = 'verified', verified_at = NOW()
      WHERE email = NEW.email AND status = 'pending_verification';
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if registration is allowed
CREATE OR REPLACE FUNCTION public.is_registration_allowed(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if email is in admin whitelist
  IF EXISTS (SELECT 1 FROM admin_whitelist WHERE admin_whitelist.email = is_registration_allowed.email) THEN
    RETURN TRUE;
  END IF;

  -- Check if email is in project_owners waitlist
  IF EXISTS (SELECT 1 FROM project_owners WHERE project_owners.email = is_registration_allowed.email) THEN
    RETURN TRUE;
  END IF;

  -- If not in any whitelist, registration is not allowed
  RETURN FALSE;
EXCEPTION
  WHEN undefined_table THEN
    -- If tables don't exist, allow registration (for initial setup)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create triggers
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_email_verification();