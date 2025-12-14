-- Allow all authenticated users to view every profile
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (true);
