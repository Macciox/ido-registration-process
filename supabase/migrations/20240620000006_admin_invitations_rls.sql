-- Enable RLS on admin_invitations table
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can do everything" ON admin_invitations;
DROP POLICY IF EXISTS "Public can use invitation links" ON admin_invitations;

-- Create new policies using functions
CREATE POLICY "Admins can do everything" 
ON admin_invitations 
FOR ALL 
TO authenticated 
USING (is_admin());

-- Allow public access for invitation verification
CREATE POLICY "Public can use invitation links" 
ON admin_invitations 
FOR SELECT 
TO anon 
USING (true);