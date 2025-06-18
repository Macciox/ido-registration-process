-- Enable RLS on project_owners table
ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can do everything" ON project_owners;
DROP POLICY IF EXISTS "Project owners can view their project owners" ON project_owners;
DROP POLICY IF EXISTS "Project owners can manage their project owners" ON project_owners;

-- Create new policies using functions
CREATE POLICY "Admins can do everything" 
ON project_owners 
FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Project owners can view their project owners" 
ON project_owners 
FOR SELECT 
TO authenticated 
USING (is_project_owner(project_id));

CREATE POLICY "Project owners can manage their project owners" 
ON project_owners 
FOR ALL 
TO authenticated 
USING (is_project_owner(project_id));