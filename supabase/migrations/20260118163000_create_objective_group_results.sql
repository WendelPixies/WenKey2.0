CREATE TABLE IF NOT EXISTS public.objective_group_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  quarter_id uuid REFERENCES public.quarters(id) ON DELETE CASCADE,
  objective_title text NOT NULL,
  avg_attainment_pct numeric DEFAULT 0,
  kr_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(company_id, quarter_id, objective_title)
);

-- Enable RLS
ALTER TABLE public.objective_group_results ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for now, following project patterns)
CREATE POLICY "Enable all for authenticated users" ON public.objective_group_results
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
