-- Allow managers/admins to insert checkin_results for any user in their companies
DROP POLICY IF EXISTS "Managers and admins can insert checkin_results" ON public.checkin_results;

CREATE POLICY "Managers and admins can insert checkin_results"
ON public.checkin_results
FOR INSERT
WITH CHECK (
  is_manager_or_admin(auth.uid())
  AND is_company_member_check(auth.uid(), company_id)
);
