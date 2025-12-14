-- Fix infinite recursion in RLS policies by using security definer functions

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND permission_type = 'admin'
  )
$$;

-- Create security definer function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND permission_type IN ('manager', 'admin')
  )
$$;

-- Create security definer function to check if user is member of a company
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Drop and recreate company_members policies using security definer functions
DROP POLICY IF EXISTS "Admins can manage company members" ON public.company_members;
DROP POLICY IF EXISTS "Users can view company members of their companies" ON public.company_members;

CREATE POLICY "Admins can manage company members"
ON public.company_members
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view company members of their companies"
ON public.company_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = company_members.company_id
  )
);

-- Update companies policies to use security definer functions
DROP POLICY IF EXISTS "Admins can create companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;

CREATE POLICY "Admins can create companies"
ON public.companies
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Update quarters policies
DROP POLICY IF EXISTS "Managers and admins can create quarters" ON public.quarters;
DROP POLICY IF EXISTS "Managers and admins can update quarters" ON public.quarters;

CREATE POLICY "Managers and admins can create quarters"
ON public.quarters
FOR INSERT
WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers and admins can update quarters"
ON public.quarters
FOR UPDATE
USING (public.is_manager_or_admin(auth.uid()));

-- Update quarter_checkins policies
DROP POLICY IF EXISTS "Managers and admins can manage checkins" ON public.quarter_checkins;

CREATE POLICY "Managers and admins can manage checkins"
ON public.quarter_checkins
FOR ALL
USING (public.is_manager_or_admin(auth.uid()));

-- Update objectives policies
DROP POLICY IF EXISTS "Managers can view all objectives in their companies" ON public.objectives;

CREATE POLICY "Managers can view all objectives in their companies"
ON public.objectives
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (
    public.is_manager_or_admin(auth.uid()) AND
    EXISTS (
      SELECT 1
      FROM quarters q
      JOIN company_members cm ON cm.company_id = q.company_id
      WHERE q.id = objectives.quarter_id
        AND cm.user_id = auth.uid()
    )
  )
);

-- Update key_results policies
DROP POLICY IF EXISTS "Managers can view all key results in their companies" ON public.key_results;

CREATE POLICY "Managers can view all key results in their companies"
ON public.key_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM objectives o
    WHERE o.id = key_results.objective_id
      AND o.user_id = auth.uid()
  ) OR
  (
    public.is_manager_or_admin(auth.uid()) AND
    EXISTS (
      SELECT 1
      FROM objectives o
      JOIN quarters q ON q.id = o.quarter_id
      JOIN company_members cm ON cm.company_id = q.company_id
      WHERE o.id = key_results.objective_id
        AND cm.user_id = auth.uid()
    )
  )
);

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add is_active column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;