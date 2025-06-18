-- Add status column to admin_whitelist table
ALTER TABLE IF EXISTS admin_whitelist 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add updated_at column to admin_whitelist table
ALTER TABLE IF EXISTS admin_whitelist 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have 'pending' status
UPDATE admin_whitelist 
SET status = 'pending' 
WHERE status IS NULL;