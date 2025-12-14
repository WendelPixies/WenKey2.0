-- Restore permission_type column and synchronization trigger
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS permission_type user_permission DEFAULT 'user' NOT NULL;

UPDATE public.profiles p
SET permission_type = COALESCE((
  SELECT ur.role::text::user_permission
  FROM public.user_roles ur
  WHERE ur.user_id = p.id
  LIMIT 1
), p.permission_type);

DROP FUNCTION IF EXISTS public.sync_permission_to_roles() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_permission_to_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = NEW.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.permission_type::text::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_permission_to_roles_trigger ON public.profiles;
CREATE TRIGGER sync_permission_to_roles_trigger
AFTER INSERT OR UPDATE OF permission_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_permission_to_roles();
