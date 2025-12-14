-- Add company_id and quarter_id to key_results table
ALTER TABLE public.key_results 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS quarter_id uuid REFERENCES public.quarters(id);

-- Update RLS policies for key_results to include company check
DROP POLICY IF EXISTS "Managers can view all key results in their companies" ON public.key_results;
DROP POLICY IF EXISTS "Users can view key results of their objectives" ON public.key_results;
DROP POLICY IF EXISTS "Users can manage key results of their objectives" ON public.key_results;

-- Create new RLS policies for key_results
CREATE POLICY "Users can view key results in their companies"
ON public.key_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = key_results.company_id
  )
);

CREATE POLICY "Users can create key results in their companies"
ON public.key_results
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = key_results.company_id
  )
);

CREATE POLICY "Users can update key results in their companies"
ON public.key_results
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = key_results.company_id
  )
);

CREATE POLICY "Managers and admins can manage all key results"
ON public.key_results
FOR ALL
USING (is_manager_or_admin(auth.uid()));