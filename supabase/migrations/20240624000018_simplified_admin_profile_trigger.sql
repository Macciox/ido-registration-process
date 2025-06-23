-- Simplified trigger to create admin profiles when status becomes 'verified'

-- Create the function
CREATE OR REPLACE FUNCTION create_admin_profile_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Insert or update the profile
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    SELECT 
      au.id,
      au.email,
      'admin',
      NOW(),
      NOW()
    FROM 
      auth.users au
    WHERE 
      au.email = NEW.email
    ON CONFLICT (id) DO UPDATE
    SET 
      role = 'admin',
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS admin_whitelist_verification_trigger ON public.admin_whitelist;

CREATE TRIGGER admin_whitelist_verification_trigger
AFTER UPDATE ON public.admin_whitelist
FOR EACH ROW
EXECUTE FUNCTION create_admin_profile_on_verification();