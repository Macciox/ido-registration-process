-- Enable RLS on quiz_questions table
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can do everything" ON quiz_questions;
DROP POLICY IF EXISTS "Project owners can view their quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Project owners can manage their quiz questions" ON quiz_questions;

-- Create new policies using functions
CREATE POLICY "Admins can do everything" 
ON quiz_questions 
FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Project owners can view their quiz questions" 
ON quiz_questions 
FOR SELECT 
TO authenticated 
USING (is_project_owner(project_id));

CREATE POLICY "Project owners can manage their quiz questions" 
ON quiz_questions 
FOR ALL 
TO authenticated 
USING (is_project_owner(project_id));