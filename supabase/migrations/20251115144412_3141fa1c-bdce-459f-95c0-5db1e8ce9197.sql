-- Fix profiles table RLS policy to scope by company
-- This prevents users from viewing profiles across different companies

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Add company-scoped policy for regular users
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

-- Admins can still view all profiles (already exists as separate policy)