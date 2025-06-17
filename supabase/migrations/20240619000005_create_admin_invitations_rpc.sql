-- Create a function to create the admin_invitations table
CREATE OR REPLACE FUNCTION create_admin_invitations_table()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_invitations'
  ) THEN
    -- Create the table
    CREATE TABLE admin_invitations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX admin_invitations_email_idx ON admin_invitations(email);
    CREATE INDEX admin_invitations_token_idx ON admin_invitations(token);
    CREATE INDEX admin_invitations_status_idx ON admin_invitations(status);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;