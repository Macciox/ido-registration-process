-- Create or replace the handle_new_user function to check admin whitelist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation RECORD;
  whitelist_entry RECORD;
  default_role TEXT := 'project_owner'; -- Default role for new users
BEGIN
  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    -- User already exists, no need to create a new profile
    RETURN NEW;
  END IF;

  -- First check if the email is in the admin whitelist
  BEGIN
    SELECT * INTO whitelist_entry 
    FROM admin_whitelist 
    WHERE email = NEW.email;

    -- If email is in admin whitelist, set role to admin
    IF whitelist_entry.id IS NOT NULL THEN
      default_role := 'admin';
      RAISE NOTICE 'User % found in admin whitelist, setting role to admin', NEW.email;
    ELSE
      -- If not in whitelist, check for invitation
      BEGIN
        SELECT * INTO invitation 
        FROM admin_invitations 
        WHERE email = NEW.email 
          AND status = 'pending' 
          AND expires_at > NOW();

        -- If invitation exists, use the assigned role from invitation
        IF invitation.id IS NOT NULL THEN
          default_role := invitation.assigned_role;
          
          -- Mark the invitation as accepted
          UPDATE admin_invitations 
          SET status = 'accepted', used_at = NOW() 
          WHERE id = invitation.id;
        END IF;
      EXCEPTION
        WHEN undefined_table THEN
          -- admin_invitations table doesn't exist, keep default role
          NULL;
      END;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- admin_whitelist table doesn't exist, check for invitation
      BEGIN
        SELECT * INTO invitation 
        FROM admin_invitations 
        WHERE email = NEW.email 
          AND status = 'pending' 
          AND expires_at > NOW();

        -- If invitation exists, use the assigned role from invitation
        IF invitation.id IS NOT NULL THEN
          default_role := invitation.assigned_role;
          
          -- Mark the invitation as accepted
          UPDATE admin_invitations 
          SET status = 'accepted', used_at = NOW() 
          WHERE id = invitation.id;
        END IF;
      EXCEPTION
        WHEN undefined_table THEN
          -- admin_invitations table doesn't exist, use default role
          NULL;
      END;
  END;

  -- Create a new profile for the user with the determined role
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    default_role,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();