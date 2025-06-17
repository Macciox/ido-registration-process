-- Add status field to admin_invitations table
ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS admin_invitations_status_idx ON admin_invitations (status);

-- Update existing invitations to have 'pending' status if they haven't been used yet
UPDATE admin_invitations 
SET status = 'pending' 
WHERE used_at IS NULL AND status IS NULL;

-- Update existing invitations to have 'accepted' status if they have been used
UPDATE admin_invitations 
SET status = 'accepted' 
WHERE used_at IS NOT NULL AND status IS NULL;