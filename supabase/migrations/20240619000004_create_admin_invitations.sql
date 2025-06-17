-- Create admin_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_invitations (
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
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS admin_invitations_token_idx ON admin_invitations(token);
CREATE INDEX IF NOT EXISTS admin_invitations_status_idx ON admin_invitations(status);