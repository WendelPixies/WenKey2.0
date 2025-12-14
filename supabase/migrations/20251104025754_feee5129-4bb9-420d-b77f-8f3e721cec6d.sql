-- Remove owner_id from key_results table
ALTER TABLE public.key_results DROP COLUMN IF EXISTS owner_id;

-- Remove owner_id from objectives table  
ALTER TABLE public.objectives DROP COLUMN IF EXISTS owner_id;