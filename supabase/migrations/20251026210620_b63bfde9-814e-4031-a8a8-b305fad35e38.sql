-- Add new fields to key_results table
ALTER TABLE public.key_results
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS floor_value numeric,
ADD COLUMN IF NOT EXISTS input_method text DEFAULT 'manual';

-- Rename columns to match the proposed structure
ALTER TABLE public.key_results
RENAME COLUMN min_threshold TO floor_value_old;

-- Update existing data
UPDATE public.key_results 
SET floor_value = floor_value_old 
WHERE floor_value_old IS NOT NULL;

-- Drop old column
ALTER TABLE public.key_results
DROP COLUMN IF EXISTS floor_value_old;

-- Create quarter_checkins table for official checkin dates
CREATE TABLE IF NOT EXISTS public.quarter_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id uuid NOT NULL REFERENCES public.quarters(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(quarter_id, checkin_date)
);

-- Create kr_checkins table for KR values per checkin
CREATE TABLE IF NOT EXISTS public.kr_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id uuid NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  quarter_checkin_id uuid NOT NULL REFERENCES public.quarter_checkins(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  value_realized numeric NOT NULL,
  attainment_pct numeric,
  note text,
  input_method text DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(key_result_id, quarter_checkin_id)
);

-- Enable RLS
ALTER TABLE public.quarter_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kr_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for quarter_checkins
CREATE POLICY "Users can view quarter_checkins of their companies"
ON public.quarter_checkins FOR SELECT
USING (is_company_member_check(auth.uid(), company_id));

CREATE POLICY "Managers and admins can manage quarter_checkins"
ON public.quarter_checkins FOR ALL
USING (is_manager_or_admin(auth.uid()));

-- RLS policies for kr_checkins
CREATE POLICY "Users can view kr_checkins of their companies"
ON public.kr_checkins FOR SELECT
USING (is_company_member_check(auth.uid(), company_id));

CREATE POLICY "Users can create kr_checkins in their companies"
ON public.kr_checkins FOR INSERT
WITH CHECK (is_company_member_check(auth.uid(), company_id) AND auth.uid() = created_by);

CREATE POLICY "Users can update their own kr_checkins"
ON public.kr_checkins FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Managers and admins can manage all kr_checkins"
ON public.kr_checkins FOR ALL
USING (is_manager_or_admin(auth.uid()));

-- Function to calculate attainment percentage
CREATE OR REPLACE FUNCTION public.calculate_kr_attainment(
  p_direction text,
  p_type text,
  p_baseline numeric,
  p_floor numeric,
  p_target numeric,
  p_realized numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_attainment numeric;
BEGIN
  -- Direction UP: more is better
  IF p_direction = 'increase' THEN
    IF p_realized >= p_target THEN
      v_attainment := 100;
    ELSIF p_realized <= p_floor THEN
      v_attainment := 0;
    ELSE
      v_attainment := ((p_realized - p_floor) / (p_target - p_floor)) * 100;
    END IF;
  
  -- Direction DOWN: less is better
  ELSIF p_direction = 'decrease' THEN
    IF p_realized <= p_target THEN
      v_attainment := 100;
    ELSIF p_realized >= p_floor THEN
      v_attainment := 0;
    ELSE
      v_attainment := ((p_floor - p_realized) / (p_floor - p_target)) * 100;
    END IF;
  
  -- Direction MAINTAIN: stay within range
  ELSE
    IF p_realized >= p_floor AND p_realized <= p_target THEN
      v_attainment := 100;
    ELSE
      v_attainment := 0;
    END IF;
  END IF;
  
  RETURN ROUND(v_attainment, 2);
END;
$$;

-- Trigger to auto-calculate attainment_pct
CREATE OR REPLACE FUNCTION public.auto_calculate_attainment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kr record;
BEGIN
  -- Get KR data
  SELECT direction, type, baseline, floor_value, target
  INTO v_kr
  FROM public.key_results
  WHERE id = NEW.key_result_id;
  
  -- Calculate attainment
  NEW.attainment_pct := public.calculate_kr_attainment(
    v_kr.direction,
    v_kr.type,
    v_kr.baseline,
    v_kr.floor_value,
    v_kr.target,
    NEW.value_realized
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_attainment_before_insert
BEFORE INSERT ON public.kr_checkins
FOR EACH ROW
EXECUTE FUNCTION public.auto_calculate_attainment();

CREATE TRIGGER calculate_attainment_before_update
BEFORE UPDATE ON public.kr_checkins
FOR EACH ROW
WHEN (OLD.value_realized IS DISTINCT FROM NEW.value_realized)
EXECUTE FUNCTION public.auto_calculate_attainment();

-- Create view for objective attainment
CREATE OR REPLACE VIEW public.objective_checkins_view AS
SELECT 
  o.id as objective_id,
  o.title as objective_title,
  qc.id as quarter_checkin_id,
  qc.checkin_date,
  qc.name as checkin_name,
  ROUND(
    SUM(krc.attainment_pct * kr.weight) / NULLIF(SUM(kr.weight), 0),
    2
  ) as objective_attainment_pct
FROM public.objectives o
JOIN public.key_results kr ON kr.objective_id = o.id
LEFT JOIN public.kr_checkins krc ON krc.key_result_id = kr.id
LEFT JOIN public.quarter_checkins qc ON qc.id = krc.quarter_checkin_id
WHERE o.archived = false
GROUP BY o.id, o.title, qc.id, qc.checkin_date, qc.name;