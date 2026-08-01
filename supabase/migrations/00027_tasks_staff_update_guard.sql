-- Ticket 0016 code review: staff task updates on active cases only; lock is_custom on update.

DROP POLICY IF EXISTS tasks_update_staff ON public.tasks;

CREATE POLICY tasks_update_staff ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND assigned_to = auth.uid()
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  )
  WITH CHECK (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND assigned_to = auth.uid()
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  );

CREATE OR REPLACE FUNCTION public.enforce_task_is_custom_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_custom IS DISTINCT FROM NEW.is_custom THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_custom'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_is_custom_immutable
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_task_is_custom_immutable();
