-- Ensure check-in results belong to the responsible user of each KR
UPDATE public.checkin_results cr
SET user_id = kr.user_id
FROM public.key_results kr
WHERE cr.key_result_id = kr.id
  AND kr.user_id IS NOT NULL
  AND cr.user_id IS DISTINCT FROM kr.user_id;
