-- Revert quarter policies to permission_type-based checks
DROP POLICY IF EXISTS "Managers and admins can create quarters" ON public.quarters;
DROP POLICY IF EXISTS "Managers and admins can update quarters" ON public.quarters;

CREATE POLICY "Managers and admins can create quarters"
  ON public.quarters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.permission_type IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update quarters"
  ON public.quarters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.permission_type IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.permission_type IN ('manager', 'admin')
    )
  );
