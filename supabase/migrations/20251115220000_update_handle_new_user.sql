-- Update handle_new_user to work without permission_type and to seed user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    position,
    sector,
    bio,
    company_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'sector',
    NEW.raw_user_meta_data->>'bio',
    NULL,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url,
      position = COALESCE(EXCLUDED.position, public.profiles.position),
      sector = COALESCE(EXCLUDED.sector, public.profiles.sector),
      bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
