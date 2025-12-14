-- Create new enum with correct values (admin, manager, user)
CREATE TYPE public.app_role_new AS ENUM ('admin', 'manager', 'user');

-- Update user_roles table to use new enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new 
  USING (
    CASE role::text
      WHEN 'admin' THEN 'admin'::app_role_new
      WHEN 'manager' THEN 'manager'::app_role_new
      WHEN 'moderator' THEN 'manager'::app_role_new
      ELSE 'user'::app_role_new
    END
  );

-- Drop old enum with cascade (this will drop dependent functions and policies)
DROP TYPE public.app_role CASCADE;

-- Rename new enum
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recreate the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Recreate the is_manager_or_admin function
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'admin')
  )
$$;

-- Recreate policies on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Recreate policies on companies
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure all existing profiles have corresponding user_roles entries
INSERT INTO public.user_roles (user_id, role)
SELECT id, permission_type::text::app_role
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Recreate the sync function
CREATE OR REPLACE FUNCTION public.sync_permission_to_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old role
  DELETE FROM public.user_roles 
  WHERE user_id = NEW.id;
  
  -- Insert new role based on permission_type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.permission_type::text::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;