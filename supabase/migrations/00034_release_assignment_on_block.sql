-- Ticket 0023: release future task assignments when a task is blocked (database_schema §9.1).

CREATE OR REPLACE FUNCTION public.release_assignment_on_block(p_task_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released integer;
BEGIN
  UPDATE public.task_assignments
     SET is_released = true,
         released_at = now()
   WHERE task_id = p_task_id
     AND is_released = false
     AND (
       date > CURRENT_DATE
       OR (date = CURRENT_DATE AND end_time > LOCALTIME)
     );

  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released;
END;
$$;

REVOKE ALL ON FUNCTION public.release_assignment_on_block(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.release_assignment_on_block(uuid) TO authenticated;
