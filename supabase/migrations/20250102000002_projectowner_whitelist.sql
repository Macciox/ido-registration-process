-- Create projectowner_whitelist table
CREATE TABLE IF NOT EXISTS projectowner_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_verification', 'registered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS projectowner_whitelist_email_idx ON projectowner_whitelist(email);
CREATE INDEX IF NOT EXISTS projectowner_whitelist_project_id_idx ON projectowner_whitelist(project_id);
CREATE INDEX IF NOT EXISTS projectowner_whitelist_status_idx ON projectowner_whitelist(status);

-- Create unique constraint to prevent duplicate email-project combinations
ALTER TABLE projectowner_whitelist ADD CONSTRAINT unique_projectowner_whitelist UNIQUE (email, project_id);

-- Enable RLS
ALTER TABLE projectowner_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage projectowner whitelist
CREATE POLICY "Admin users can view projectowner whitelist"
  ON projectowner_whitelist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert projectowner whitelist"
  ON projectowner_whitelist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update projectowner whitelist"
  ON projectowner_whitelist FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete projectowner whitelist"
  ON projectowner_whitelist FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );