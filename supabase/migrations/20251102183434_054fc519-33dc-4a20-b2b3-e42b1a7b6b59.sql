-- Add owner_id to key_results table to track the responsible person
ALTER TABLE public.key_results
ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX idx_key_results_owner_id ON public.key_results(owner_id);