-- Team Task OS: firm tasks on the internal case are not subject to the
-- per-client-case cap of 5 custom tasks (ADR-0019 / ADR-0023).

CREATE OR REPLACE FUNCTION public.enforce_custom_task_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  custom_count integer;
  v_is_internal boolean;
BEGIN
  IF NEW.is_custom = false OR NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  SELECT c.is_internal
    INTO v_is_internal
    FROM public.cases c
   WHERE c.id = NEW.case_id;

  IF v_is_internal = true THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer INTO custom_count
    FROM public.tasks t
   WHERE t.case_id = NEW.case_id
     AND t.is_custom = true
     AND t.is_deleted = false;

  IF custom_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 custom tasks allowed per case'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
