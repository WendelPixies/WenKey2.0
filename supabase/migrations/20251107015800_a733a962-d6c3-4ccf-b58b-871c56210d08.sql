-- Add percent_obj field to objectives table
ALTER TABLE public.objectives 
ADD COLUMN percent_obj numeric DEFAULT 0;

-- Add percent_kr field to key_results table
ALTER TABLE public.key_results 
ADD COLUMN percent_kr numeric DEFAULT 0;

-- Add comment to clarify the new columns
COMMENT ON COLUMN public.objectives.percent_obj IS 'Percentage progress of the objective (0-100)';
COMMENT ON COLUMN public.key_results.percent_kr IS 'Percentage progress of the key result (0-100)';