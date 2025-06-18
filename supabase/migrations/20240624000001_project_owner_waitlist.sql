-- Create project_owners table if it doesn't exist (this is our waitlist)
CREATE TABLE IF NOT EXISTS project_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS project_owners_project_id_idx ON project_owners(project_id);
CREATE INDEX IF NOT EXISTS project_owners_email_idx ON project_owners(email);
CREATE INDEX IF NOT EXISTS project_owners_status_idx ON project_owners(status);

-- Create or replace the handle_new_user function to check admin whitelist and project_owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  whitelist_entry RECORD;
  project_owner_entries RECORD;
BEGIN
  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    -- User already exists, no need to create a new profile
    RETURN NEW;
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

  -- If we get here, the user is not in any whitelist, create with default role
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'project_owner', -- Default role
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();