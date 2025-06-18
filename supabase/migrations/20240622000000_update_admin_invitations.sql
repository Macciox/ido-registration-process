-- Add assigned_role column to admin_invitations table
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_invitations'
  ) THEN
    -- Add assigned_role column if it doesn't exist
    ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS assigned_role TEXT NOT NULL DEFAULT 'admin';
    
    -- Update existing invitations to have 'admin' role
    UPDATE admin_invitations SET assigned_role = 'admin' WHERE assigned_role IS NULL;
  END IF;
END $$;