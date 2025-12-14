-- Add missing fields to objectives table
ALTER TABLE public.objectives
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS parent_objective_id uuid REFERENCES public.objectives(id),
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Update objectives RLS policies to include company_id
DROP POLICY IF EXISTS "Users can view own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Managers can view all objectives in their companies" ON public.objectives;
DROP POLICY IF EXISTS "Users can create own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can update own objectives" ON public.objectives;

CREATE POLICY "Users can view objectives in their companies"
ON public.objectives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = objectives.company_id
  )
);

CREATE POLICY "Users can create objectives in their companies"
ON public.objectives
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = objectives.company_id
  )
);

CREATE POLICY "Users can update objectives in their companies"
ON public.objectives
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = objectives.company_id
  )
);

-- Add missing fields to key_results table
ALTER TABLE public.key_results
DROP COLUMN IF EXISTS metric_type,
DROP COLUMN IF EXISTS target_value,
DROP COLUMN IF EXISTS current_value,
DROP COLUMN IF EXISTS meta_min,
DROP COLUMN IF EXISTS meta_max,
DROP COLUMN IF EXISTS tipo_meta,
DROP COLUMN IF EXISTS peso,
DROP COLUMN IF EXISTS responsavel_id,
DROP COLUMN IF EXISTS titulo,
DROP COLUMN IF EXISTS description;

-- Add new fields matching the schema
ALTER TABLE public.key_results
ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS direction text,
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS baseline numeric,
ADD COLUMN IF NOT EXISTS target numeric,
ADD COLUMN IF NOT EXISTS current numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS min_threshold numeric,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Update key_results RLS policies
DROP POLICY IF EXISTS "Users can create key results in their companies" ON public.key_results;
DROP POLICY IF EXISTS "Users can view key results in their companies" ON public.key_results;
DROP POLICY IF EXISTS "Users can update key results in their companies" ON public.key_results;
DROP POLICY IF EXISTS "Managers and admins can manage all key results" ON public.key_results;

CREATE POLICY "Users can view key results in their companies"
ON public.key_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = key_results.company_id
  )
);

CREATE POLICY "Users can create key results in their companies"
ON public.key_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = key_results.company_id
  )
);

CREATE POLICY "Users can update key results in their companies"
ON public.key_results
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = key_results.company_id
  )
);

CREATE POLICY "Managers and admins can manage all key results"
ON public.key_results
FOR ALL
TO authenticated
USING (is_manager_or_admin(auth.uid()));