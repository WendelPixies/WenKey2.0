-- Allow KR owners to update check-in results even if they didn't create the record
DROP POLICY IF EXISTS "Users can update their own checkin_results" ON public.checkin_results;

CREATE POLICY "Users can update assigned checkin_results"
ON public.checkin_results
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.key_results kr
    WHERE kr.id = key_result_id
      AND kr.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.key_results kr
    WHERE kr.id = key_result_id
      AND kr.user_id = auth.uid()
  )
);
