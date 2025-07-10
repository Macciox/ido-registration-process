-- Drop existing handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create or replace the handle_new_user function with improved project owner handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  whitelist_entry RECORD;
  project_owner_entries RECORD;
BEGIN
  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
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
      
      -- Update admin whitelist status
      UPDATE admin_whitelist
      SET status = 'registered'
      WHERE id = whitelist_entry.id;
      
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  -- Check if the email is in project_owners table
  BEGIN
    -- Get all pending project owner entries for this email
    SELECT array_agg(project_id) as project_ids INTO project_owner_entries
    FROM project_owners
    WHERE email = NEW.email AND status = 'pending';
    
    -- If found in project_owners, create profile and associate with projects
    IF project_owner_entries.project_ids IS NOT NULL THEN
      -- Create profile with project_owner role
      INSERT INTO public.profiles (id, email, role, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        'project_owner',
        NOW(),
        NOW()
      );
      
      -- Update all pending project_owners entries to verified
      UPDATE project_owners
      SET 
        status = 'verified',
        verified_at = NOW(),
        updated_at = NOW(),
        user_id = NEW.id  -- Associate with the new user
      WHERE email = NEW.email 
      AND status = 'pending';
      
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  -- If we get here, create profile with default role (not admin or project owner)
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user',  -- Changed default role to 'user' instead of 'project_owner'
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add user_id column to project_owners if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'project_owners' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE project_owners
    ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS project_owners_user_id_idx ON project_owners(user_id);

-- Create function to get projects for a user
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS TABLE (
  project_id UUID,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.project_id,
    po.is_primary
  FROM project_owners po
  WHERE po.user_id = get_user_projects.user_id
  AND po.status = 'verified';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;