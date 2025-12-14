-- Ensure at least one admin exists by promoting the earliest user if needed
DO $$
DECLARE
  target_user UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    SELECT id
    INTO target_user
    FROM auth.users
    ORDER BY created_at
    LIMIT 1;

    IF target_user IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END;
$$;
