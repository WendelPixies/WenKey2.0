-- Fix search_path for calculate_kr_attainment function
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
SECURITY DEFINER
SET search_path = public
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