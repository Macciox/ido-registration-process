-- Add creator_status field to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS creator_status VARCHAR(50) DEFAULT 'active';

-- Add status field to project_owners table if it doesn't exist
ALTER TABLE public.project_owners
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Update RLS policies to include the new fields
ALTER POLICY "Enable read access for all users" ON public.projects
USING (true);

COMMENT ON COLUMN public.projects.creator_status IS 'Status of the project creator (active, deleted, etc.)';
COMMENT ON COLUMN public.project_owners.status IS 'Status of the project owner (active, deleted, etc.)';