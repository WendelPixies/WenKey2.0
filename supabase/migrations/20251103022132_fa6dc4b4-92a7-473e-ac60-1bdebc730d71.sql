-- Create table to store quarter final results
CREATE TABLE public.quarter_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter_id UUID NOT NULL REFERENCES public.quarters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  result_percent NUMERIC NOT NULL DEFAULT 0,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quarter_id, user_id)
);

-- Enable RLS
ALTER TABLE public.quarter_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own quarter results"
  ON public.quarter_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view quarter results of their companies"
  ON public.quarter_results
  FOR SELECT
  USING (is_company_member_check(auth.uid(), company_id));

CREATE POLICY "Admins can view all quarter results"
  ON public.quarter_results
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert quarter results"
  ON public.quarter_results
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update quarter results"
  ON public.quarter_results
  FOR UPDATE
  USING (true);

CREATE POLICY "Managers and admins can manage quarter results"
  ON public.quarter_results
  FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_quarter_results_updated_at
  BEFORE UPDATE ON public.quarter_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_quarter_results_quarter_id ON public.quarter_results(quarter_id);
CREATE INDEX idx_quarter_results_user_id ON public.quarter_results(user_id);
CREATE INDEX idx_quarter_results_company_id ON public.quarter_results(company_id);