-- Drop existing triggers and functions with CASCADE
DROP TRIGGER IF EXISTS update_kr_percent_trigger ON kr_checkins CASCADE;
DROP TRIGGER IF EXISTS trigger_update_kr_percent ON kr_checkins CASCADE;
DROP TRIGGER IF EXISTS update_objective_percent_trigger ON key_results CASCADE;
DROP FUNCTION IF EXISTS update_kr_percent() CASCADE;
DROP FUNCTION IF EXISTS update_objective_percent() CASCADE;
DROP FUNCTION IF EXISTS recalculate_all_percentages() CASCADE;

-- Create function to update percent_kr when checkin_results is inserted/updated
CREATE OR REPLACE FUNCTION public.update_kr_percent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar o percent_kr do key_result com o percentual_atingido mais recente
  UPDATE public.key_results
  SET percent_kr = NEW.percentual_atingido,
      updated_at = now()
  WHERE id = NEW.key_result_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for checkin_results
CREATE TRIGGER update_kr_percent_trigger
AFTER INSERT OR UPDATE ON public.checkin_results
FOR EACH ROW
EXECUTE FUNCTION public.update_kr_percent();

-- Create function to update percent_obj when key_results percent_kr is updated
CREATE OR REPLACE FUNCTION public.update_objective_percent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_avg_percent numeric;
BEGIN
  -- Calcular a média dos percent_kr de todos os KRs do objetivo
  SELECT AVG(percent_kr)
  INTO v_avg_percent
  FROM public.key_results
  WHERE objective_id = NEW.objective_id
    AND percent_kr IS NOT NULL;
  
  -- Atualizar o percent_obj do objetivo
  UPDATE public.objectives
  SET percent_obj = COALESCE(v_avg_percent, 0),
      updated_at = now()
  WHERE id = NEW.objective_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for key_results
CREATE TRIGGER update_objective_percent_trigger
AFTER UPDATE OF percent_kr ON public.key_results
FOR EACH ROW
EXECUTE FUNCTION public.update_objective_percent();

-- Create function to recalculate all percentages
CREATE OR REPLACE FUNCTION public.recalculate_all_percentages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  kr_record record;
  obj_record record;
  latest_percent numeric;
  avg_kr_percent numeric;
BEGIN
  -- 1) Atualizar todos os percent_kr com base no último checkin_results
  FOR kr_record IN 
    SELECT DISTINCT kr.id as kr_id
    FROM public.key_results kr
  LOOP
    -- Pegar o percentual_atingido mais recente para este KR
    SELECT percentual_atingido INTO latest_percent
    FROM public.checkin_results
    WHERE key_result_id = kr_record.kr_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Atualizar o percent_kr
    IF latest_percent IS NOT NULL THEN
      UPDATE public.key_results
      SET percent_kr = latest_percent,
          updated_at = now()
      WHERE id = kr_record.kr_id;
    END IF;
  END LOOP;
  
  -- 2) Atualizar todos os percent_obj com base na média dos KRs
  FOR obj_record IN 
    SELECT id as obj_id
    FROM public.objectives
  LOOP
    -- Calcular média dos percent_kr
    SELECT AVG(percent_kr) INTO avg_kr_percent
    FROM public.key_results
    WHERE objective_id = obj_record.obj_id
      AND percent_kr IS NOT NULL;
    
    -- Atualizar o percent_obj
    UPDATE public.objectives
    SET percent_obj = COALESCE(avg_kr_percent, 0),
        updated_at = now()
    WHERE id = obj_record.obj_id;
  END LOOP;
  
  RAISE NOTICE 'Recalculation complete';
END;
$function$;

-- Execute recalculation immediately for existing data
SELECT recalculate_all_percentages();