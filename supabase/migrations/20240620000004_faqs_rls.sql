-- Enable RLS on faqs table
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can do everything" ON faqs;
DROP POLICY IF EXISTS "Project owners can view their faqs" ON faqs;
DROP POLICY IF EXISTS "Project owners can manage their faqs" ON faqs;

-- Create new policies using functions
CREATE POLICY "Admins can do everything" 
ON faqs 
FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Project owners can view their faqs" 
ON faqs 
FOR SELECT 
TO authenticated 
USING (is_project_owner(project_id));

CREATE POLICY "Project owners can manage their faqs" 
ON faqs 
FOR ALL 
TO authenticated 
USING (is_project_owner(project_id));