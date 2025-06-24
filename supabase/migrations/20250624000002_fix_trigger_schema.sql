-- Fix trigger to use correct schema references
CREATE OR REPLACE FUNCTION handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email_confirmed_at was just set (changed from null to a timestamp)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Check if user is in admin whitelist (specify public schema)
    IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN
      -- Update admin whitelist status
      UPDATE public.admin_whitelist 
      SET status = 'registered' 
      WHERE email = NEW.email;
      
      -- Create admin profile
      INSERT INTO public.profiles (id, email, role)
      VALUES (NEW.id, NEW.email, 'admin')
      ON CONFLICT (id) DO NOTHING;
      
    -- Check if user is in project owners (specify public schema)
    ELSIF EXISTS (SELECT 1 FROM public.project_owners WHERE email = NEW.email) THEN
      -- Update project owners status
      UPDATE public.project_owners 
      SET status = 'registered' 
      WHERE email = NEW.email;
      
      -- Create project owner profile
      INSERT INTO public.profiles (id, email, role)
      VALUES (NEW.id, NEW.email, 'project_owner')
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;