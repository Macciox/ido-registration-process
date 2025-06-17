-- Add status field to project_owners table
ALTER TABLE project_owners ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS project_owners_status_idx ON project_owners (status);

-- Add verified_at field to project_owners table
ALTER TABLE project_owners ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Update existing project_owners to have 'pending' status if they haven't been verified yet
UPDATE project_owners 
SET status = 'pending' 
WHERE verified_at IS NULL AND status IS NULL;

-- Update existing project_owners to have 'verified' status if they have been verified
UPDATE project_owners 
SET status = 'verified' 
WHERE verified_at IS NOT NULL AND status IS NULL;