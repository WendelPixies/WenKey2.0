-- Update quarter policies to use user_roles-based helpers instead of permission_type
DROP POLICY IF EXISTS "Managers and admins can create quarters" ON public.quarters;
DROP POLICY IF EXISTS "Managers and admins can update quarters" ON public.quarters;

CREATE POLICY "Managers and admins can create quarters"
  ON public.quarters
  FOR INSERT
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers and admins can update quarters"
  ON public.quarters
  FOR UPDATE
  USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));
