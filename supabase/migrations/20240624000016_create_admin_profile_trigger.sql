-- Create a trigger to automatically create a profile when admin_whitelist status changes to 'verified'

-- First, create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION create_admin_profile_on_verification()
RETURNS TRIGGER AS $$
DECLARE
  user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Check if the status changed to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Try to find the user ID from auth.users
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      -- Check if profile already exists
      SELECT EXISTS(
        SELECT 1 FROM public.profiles WHERE id = user_id
      ) INTO user_exists;
      
      IF NOT user_exists THEN
        -- Create profile with admin role
        INSERT INTO public.profiles (id, email, role, created_at, updated_at)
        VALUES (
          user_id,
          NEW.email,
          'admin',
          NOW(),
          NOW()
        );
        
        RAISE NOTICE 'Created admin profile for user %', NEW.email;
      ELSE
        -- Update existing profile to admin role
        UPDATE public.profiles
        SET role = 'admin', updated_at = NOW()
        WHERE id = user_id;
        
        RAISE NOTICE 'Updated profile for user % to admin role', NEW.email;
      END IF;
    END IF;
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