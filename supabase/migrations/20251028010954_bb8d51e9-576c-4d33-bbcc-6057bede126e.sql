-- Adicionar colunas para meta e mínimo de cada checkin
ALTER TABLE public.checkin_results
ADD COLUMN meta_checkin numeric,
ADD COLUMN minimo_orcamento numeric;