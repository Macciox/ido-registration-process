-- Enable RLS on admin_invitations table
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_invitations'
  ) THEN
    -- Enable RLS
    ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can do everything" ON admin_invitations;
    DROP POLICY IF EXISTS "Public can use invitation links" ON admin_invitations;

    -- Create new policies using functions
    EXECUTE 'CREATE POLICY "Admins can do everything" 
    ON admin_invitations 
    FOR ALL 
    TO authenticated 
    USING (is_admin())';

    -- Allow public access for invitation verification
    EXECUTE 'CREATE POLICY "Public can use invitation links" 
    ON admin_invitations 
    FOR SELECT 
    TO anon 
    USING (true)';
  END IF;
END $$;