-- Create checkin_results table
CREATE TABLE IF NOT EXISTS public.checkin_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
  key_result_id UUID NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  valor_realizado DECIMAL,
  percentual_atingido DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to key_results table for complete OKR structure
ALTER TABLE public.key_results 
ADD COLUMN IF NOT EXISTS meta_min DECIMAL,
ADD COLUMN IF NOT EXISTS meta_max DECIMAL,
ADD COLUMN IF NOT EXISTS tipo_meta TEXT DEFAULT 'Número',
ADD COLUMN IF NOT EXISTS peso DECIMAL DEFAULT 1,
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.profiles(id);

-- Rename existing columns in key_results to match OKR nomenclature
ALTER TABLE public.key_results 
RENAME COLUMN title TO titulo;

-- Update existing target_value to meta_max if meta_max doesn't have data
UPDATE public.key_results 
SET meta_max = target_value 
WHERE meta_max IS NULL;

-- Enable RLS on checkin_results
ALTER TABLE public.checkin_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for checkin_results
CREATE POLICY "Users can view checkin_results of their companies"
ON public.checkin_results
FOR SELECT
USING (is_company_member_check(auth.uid(), company_id));

CREATE POLICY "Users can create their own checkin_results"
ON public.checkin_results
FOR INSERT
WITH CHECK (is_company_member_check(auth.uid(), company_id) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own checkin_results"
ON public.checkin_results
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can manage all checkin_results"
ON public.checkin_results
FOR ALL
USING (is_manager_or_admin(auth.uid()));

-- Create trigger for updated_at on checkin_results
CREATE TRIGGER update_checkin_results_updated_at
BEFORE UPDATE ON public.checkin_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();