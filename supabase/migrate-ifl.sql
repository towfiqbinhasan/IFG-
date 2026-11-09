-- =====================================================================
--  Migration: Update to "The Intelligence Forge Lab" branding
--  Run this in Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

-- 1. Allow uppercase in usernames (e.g. Rahim.IFL.01)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_check 
  CHECK (username ~ '^[a-zA-Z0-9._-]{3,32}$');

-- 2. Update lab name
UPDATE public.app_settings SET lab_name = 'The Intelligence Forge Lab' WHERE id = 1;

-- 3. Update handle_new_user to preserve username case from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := coalesce(new.raw_user_meta_data ->> 'username', lower(split_part(new.email, '@', 1)));
  INSERT INTO public.profiles (id, username, full_name, role, must_change_password)
  VALUES (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', v_username),
    'member',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Done! Verify:
SELECT lab_name FROM public.app_settings;
