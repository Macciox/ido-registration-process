-- Enable RLS on project_fields table
ALTER TABLE project_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can do everything" ON project_fields;
DROP POLICY IF EXISTS "Project owners can view their fields" ON project_fields;
DROP POLICY IF EXISTS "Project owners can update their fields" ON project_fields;

-- Create new policies using functions
CREATE POLICY "Admins can do everything" 
ON project_fields 
FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Project owners can view their fields" 
ON project_fields 
FOR SELECT 
TO authenticated 
USING (is_project_owner(project_id));

CREATE POLICY "Project owners can update their fields" 
ON project_fields 
FOR UPDATE 
TO authenticated 
USING (is_project_owner(project_id));