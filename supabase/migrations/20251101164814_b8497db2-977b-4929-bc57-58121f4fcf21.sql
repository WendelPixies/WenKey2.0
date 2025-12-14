-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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

-- Migrate existing permission_type data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, permission_type::text::app_role
FROM public.profiles
WHERE permission_type IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update existing security definer functions to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
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

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop old company policies
DROP POLICY IF EXISTS "Admins can create companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;

-- Create new company policies
CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to automatically add user as company member
CREATE OR REPLACE FUNCTION public.add_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id)
  VALUES (NEW.id, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_member();