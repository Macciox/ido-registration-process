-- Enable RLS on project_owners table
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'project_owners'
  ) THEN
    -- Enable RLS
    ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can do everything" ON project_owners;
    DROP POLICY IF EXISTS "Project owners can view their project owners" ON project_owners;
    DROP POLICY IF EXISTS "Project owners can manage their project owners" ON project_owners;

    -- Create new policies using functions
    EXECUTE 'CREATE POLICY "Admins can do everything" 
    ON project_owners 
    FOR ALL 
    TO authenticated 
    USING (is_admin())';

    EXECUTE 'CREATE POLICY "Project owners can view their project owners" 
    ON project_owners 
    FOR SELECT 
    TO authenticated 
    USING (is_project_owner(project_id))';

    EXECUTE 'CREATE POLICY "Project owners can manage their project owners" 
    ON project_owners 
    FOR ALL 
    TO authenticated 
    USING (is_project_owner(project_id))';
  END IF;
END $$;