-- Add result_percent column to checkins to persist aggregated attainment per check-in
ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS result_percent numeric;

COMMENT ON COLUMN public.checkins.result_percent IS 'Snapshot do percentual médio atingido pelo check-in quando o próximo período iniciar';
