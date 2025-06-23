-- Script to create missing profiles for users in admin_whitelist with status 'verified'

-- Insert profiles for all verified admins that don't have a profile yet
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin',
  NOW(),
  NOW()
FROM 
  auth.users au
JOIN 
  public.admin_whitelist aw ON au.email = aw.email
LEFT JOIN 
  public.profiles p ON au.id = p.id
WHERE 
  aw.status = 'verified'
  AND p.id IS NULL;

-- Update the role to 'admin' for any existing profiles that should be admins
UPDATE public.profiles p
SET 
  role = 'admin',
  updated_at = NOW()
FROM 
  auth.users au
JOIN 
  public.admin_whitelist aw ON au.email = aw.email
WHERE 
  p.id = au.id
  AND aw.status = 'verified'
  AND p.role != 'admin';

-- Output the results
SELECT 
  'Created or updated profiles for verified admins' as operation,
  COUNT(*) as count
FROM 
  public.profiles p
JOIN 
  auth.users au ON p.id = au.id
JOIN 
  public.admin_whitelist aw ON au.email = aw.email
WHERE 
  aw.status = 'verified'
  AND p.role = 'admin';