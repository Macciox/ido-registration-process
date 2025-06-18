-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policies using functions
CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Admins can update all profiles" 
ON profiles 
FOR UPDATE 
TO authenticated 
USING (is_admin());