-- Modify the handle_new_user function to set status to 'pending_verification'
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
      
      -- Update admin_whitelist status to pending_verification
      UPDATE admin_whitelist
      SET status = 'pending_verification', updated_at = NOW()
      WHERE email = NEW.email;
      
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- admin_whitelist table doesn't exist, continue to project_owners check
      NULL;
  END;

  -- Check if the email is in project_owners table (waitlist)
  BEGIN
    -- Update all pending project_owners entries for this email to pending_verification
    UPDATE project_owners
    SET status = 'pending_verification', updated_at = NOW()
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

-- Create a function to handle email verification
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an email verification update
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Update admin_whitelist status to verified if exists
    BEGIN
      UPDATE admin_whitelist
      SET status = 'verified', updated_at = NOW()
      WHERE email = NEW.email;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
    
    -- Update project_owners status to verified if exists
    BEGIN
      UPDATE project_owners
      SET status = 'verified', verified_at = NOW(), updated_at = NOW()
      WHERE email = NEW.email AND status = 'pending_verification';
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add status column to admin_whitelist if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_whitelist'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'admin_whitelist'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE admin_whitelist ADD COLUMN status TEXT DEFAULT 'pending';
    ALTER TABLE admin_whitelist ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_email_verification();