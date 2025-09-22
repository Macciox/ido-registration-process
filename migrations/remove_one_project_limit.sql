-- Remove any constraints that limit users to one project

-- Drop any unique constraints on project ownership
DO $$ 
BEGIN
  -- Check if there's a unique constraint on user_id in project_owners
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%user_id%' 
    AND table_name = 'project_owners'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE project_owners DROP CONSTRAINT IF EXISTS project_owners_user_id_key;
  END IF;
  
  -- Check if there's a unique constraint on email in projectowner_whitelist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%email%' 
    AND table_name = 'projectowner_whitelist'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE projectowner_whitelist DROP CONSTRAINT IF EXISTS projectowner_whitelist_email_key;
  END IF;
END $$;

-- Drop any functions that might enforce one project per user
DROP FUNCTION IF EXISTS check_user_project_limit();
DROP FUNCTION IF EXISTS enforce_single_project_ownership();

-- Remove any triggers that might enforce this limit
DROP TRIGGER IF EXISTS check_project_ownership_limit ON projects;
DROP TRIGGER IF EXISTS check_project_ownership_limit ON project_owners;
DROP TRIGGER IF EXISTS check_project_ownership_limit ON projectowner_whitelist;

-- Update any RLS policies that might enforce this
DROP POLICY IF EXISTS "Users can only own one project" ON projects;
DROP POLICY IF EXISTS "Users can only own one project" ON project_owners;
DROP POLICY IF EXISTS "Users can only own one project" ON projectowner_whitelist;