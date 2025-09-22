-- Remove any constraints that limit users to one project

-- Drop specific unique constraints that might limit project ownership
ALTER TABLE project_owners DROP CONSTRAINT IF EXISTS project_owners_user_id_key;
ALTER TABLE project_owners DROP CONSTRAINT IF EXISTS project_owners_email_key;
ALTER TABLE projectowner_whitelist DROP CONSTRAINT IF EXISTS projectowner_whitelist_email_key;
ALTER TABLE projectowner_whitelist DROP CONSTRAINT IF EXISTS projectowner_whitelist_user_id_key;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_key;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_creator_id_key;

-- Drop any functions that might enforce one project per user
DROP FUNCTION IF EXISTS check_user_project_limit() CASCADE;
DROP FUNCTION IF EXISTS enforce_single_project_ownership() CASCADE;
DROP FUNCTION IF EXISTS validate_project_ownership() CASCADE;
DROP FUNCTION IF EXISTS check_project_owner_limit() CASCADE;

-- Remove any triggers that might enforce this limit
DROP TRIGGER IF EXISTS check_project_ownership_limit ON projects;
DROP TRIGGER IF EXISTS check_project_ownership_limit ON project_owners;
DROP TRIGGER IF EXISTS check_project_ownership_limit ON projectowner_whitelist;
DROP TRIGGER IF EXISTS validate_project_ownership_trigger ON projects;
DROP TRIGGER IF EXISTS validate_project_ownership_trigger ON project_owners;
DROP TRIGGER IF EXISTS validate_project_ownership_trigger ON projectowner_whitelist;

-- Update any RLS policies that might enforce this
DROP POLICY IF EXISTS "Users can only own one project" ON projects;
DROP POLICY IF EXISTS "Users can only own one project" ON project_owners;
DROP POLICY IF EXISTS "Users can only own one project" ON projectowner_whitelist;
DROP POLICY IF EXISTS "One project per user" ON projects;
DROP POLICY IF EXISTS "One project per user" ON project_owners;
DROP POLICY IF EXISTS "One project per user" ON projectowner_whitelist;

-- Allow multiple projects per user
COMMENT ON TABLE projects IS 'Users can now own multiple projects';
COMMENT ON TABLE project_owners IS 'Users can be owners of multiple projects';
COMMENT ON TABLE projectowner_whitelist IS 'Users can be whitelisted for multiple projects';