-- Run this SQL directly in the Supabase SQL Editor to create the missing profile

-- Insert the missing profile for sbubix@gmail.com
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
VALUES (
  'e40972d9-582c-41ee-b0bd-4128cea6a864', -- User ID from Supabase Auth
  'sbubix@gmail.com',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  updated_at = NOW();

-- Verify the profile was created
SELECT * FROM public.profiles WHERE email = 'sbubix@gmail.com';