-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can do everything" ON projects;
DROP POLICY IF EXISTS "Project owners can view their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;

-- Create new policies using functions
CREATE POLICY "Admins can do everything" 
ON projects 
FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Project owners can view their projects" 
ON projects 
FOR SELECT 
TO authenticated 
USING (is_project_owner(id));

CREATE POLICY "Project owners can update their projects" 
ON projects 
FOR UPDATE 
TO authenticated 
USING (is_project_owner(id));