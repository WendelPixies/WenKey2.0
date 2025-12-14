-- Função para atualizar percent_kr quando há novo check-in
CREATE OR REPLACE FUNCTION public.update_kr_percent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar o percent_kr do key_result com o attainment_pct mais recente
  UPDATE public.key_results
  SET percent_kr = NEW.attainment_pct,
      updated_at = now()
  WHERE id = NEW.key_result_id;
  
  RETURN NEW;
END;
$$;

-- Trigger que dispara após INSERT ou UPDATE em kr_checkins
CREATE TRIGGER trigger_update_kr_percent
AFTER INSERT OR UPDATE OF attainment_pct ON public.kr_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_kr_percent();

-- Função para atualizar percent_obj quando um KR é atualizado
CREATE OR REPLACE FUNCTION public.update_objective_percent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Trigger que dispara após UPDATE de percent_kr em key_results
CREATE TRIGGER trigger_update_objective_percent
AFTER UPDATE OF percent_kr ON public.key_results
FOR EACH ROW
WHEN (OLD.percent_kr IS DISTINCT FROM NEW.percent_kr)
EXECUTE FUNCTION public.update_objective_percent();

-- Função para recalcular todos os percentuais baseado nos checkins existentes
CREATE OR REPLACE FUNCTION public.recalculate_all_percentages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  kr_record record;
  obj_record record;
  latest_attainment numeric;
  avg_kr_percent numeric;
BEGIN
  -- 1) Atualizar todos os percent_kr com base no último checkin
  FOR kr_record IN 
    SELECT DISTINCT kr.id as kr_id
    FROM public.key_results kr
  LOOP
    -- Pegar o attainment_pct mais recente para este KR
    SELECT attainment_pct INTO latest_attainment
    FROM public.kr_checkins
    WHERE key_result_id = kr_record.kr_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Atualizar o percent_kr
    IF latest_attainment IS NOT NULL THEN
      UPDATE public.key_results
      SET percent_kr = latest_attainment,
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
$$;

-- Executar a função para recalcular todos os percentuais existentes
SELECT public.recalculate_all_percentages();