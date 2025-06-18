-- Create a function to check if an email is allowed to register
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

-- Create or replace the handle_new_user function to check whitelist before creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  whitelist_entry RECORD;
  project_owner_entries RECORD;
  is_allowed BOOLEAN;
BEGIN
  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    -- User already exists, no need to create a new profile
    RETURN NEW;
  END IF;

  -- Check if registration is allowed for this email
  SELECT public.is_registration_allowed(NEW.email) INTO is_allowed;
  
  IF NOT is_allowed THEN
    -- Registration not allowed, raise exception to prevent user creation
    RAISE EXCEPTION 'Registration not allowed for email %', NEW.email;
  END IF;

  -- First check if the email is in the admin whitelist
  BEGIN
    SELECT * INTO whitelist_entry 
    FROM admin_whitelist 
    WHERE email = NEW.email;

    -- If email is in admin whitelist, set role to admin
    IF whitelist_entry.id IS NOT NULL THEN
      -- Create profile with admin role
      INSERT INTO public.profiles (id, email, role, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        'admin',
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'User % found in admin whitelist, setting role to admin', NEW.email;
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- admin_whitelist table doesn't exist, continue to project_owners check
      NULL;
  END;

  -- Check if the email is in project_owners table (waitlist)
  BEGIN
    -- Update all pending project_owners entries for this email to verified
    UPDATE project_owners
    SET status = 'verified', verified_at = NOW(), updated_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
    
    -- Get count of updated rows
    GET DIAGNOSTICS project_owner_entries = ROW_COUNT;
    
    -- Create profile with project_owner role if found in waitlist
    IF project_owner_entries > 0 THEN
      INSERT INTO public.profiles (id, email, role, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        'project_owner',
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'User % found in project_owners waitlist, setting role to project_owner', NEW.email;
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- project_owners table doesn't exist, use default role
      NULL;
  END;

  -- This should never happen due to the is_allowed check above
  -- But just in case, raise an exception
  RAISE EXCEPTION 'Registration not allowed for email %', NEW.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();