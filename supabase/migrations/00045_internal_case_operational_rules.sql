-- Ticket 0047: internal case never completes; ad-hoc tasks allow not_started → completed.

CREATE OR REPLACE FUNCTION public.check_case_completion(p_case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.cases c
     WHERE c.id = p_case_id
       AND c.is_internal = true
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.tasks t
     WHERE t.case_id = p_case_id
       AND t.is_deleted = false
       AND t.status <> 'completed'::public.task_status
  ) THEN
    RETURN false;
  END IF;

  PERFORM set_config('lawcrm.case_completion', '1', true);

  UPDATE public.cases
     SET status = 'completed'::public.case_status,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_case_id
     AND is_deleted = false
     AND status = 'active'::public.case_status;

  PERFORM set_config('lawcrm.case_completion', '', true);

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_status(
  p_task_id uuid,
  p_new_status public.task_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_role text;
  v_uid uuid := auth.uid();
  v_case_completed boolean := false;
  v_case_is_internal boolean := false;
BEGIN
  v_role := coalesce(public.jwt_role(), '');

  IF v_uid IS NULL OR coalesce(public.is_active_user(), false) = false THEN
    RAISE EXCEPTION 'FORBIDDEN: active session required'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_task
    FROM public.tasks
   WHERE id = p_task_id
     AND is_deleted = false
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: task % not found', p_task_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT c.is_internal
    INTO v_case_is_internal
    FROM public.cases c
   WHERE c.id = v_task.case_id
     AND c.is_deleted = false;

  IF EXISTS (
    SELECT 1
      FROM public.cases c
     WHERE c.id = v_task.case_id
       AND c.is_deleted = false
       AND c.status IN ('rejected'::public.case_status, 'completed'::public.case_status)
  ) THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: this case is read-only'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_role = 'admin' THEN
    NULL;
  ELSIF v_role IN ('staff', 'senior') THEN
    IF v_task.assigned_to IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN: task is not assigned to you'
        USING ERRCODE = '42501';
    END IF;

    IF v_task.case_id NOT IN (SELECT public.staff_assigned_active_case_ids()) THEN
      RAISE EXCEPTION 'FORBIDDEN: case is not assigned to you'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN: role not permitted'
      USING ERRCODE = '42501';
  END IF;

  IF p_new_status NOT IN (
    'not_started'::public.task_status,
    'in_progress'::public.task_status,
    'completed'::public.task_status
  ) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: status must be not_started, in_progress, or completed'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_task.status = 'completed'::public.task_status
     AND p_new_status IS DISTINCT FROM 'completed'::public.task_status THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: completed tasks cannot be reverted in MVP'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_new_status = 'in_progress'::public.task_status THEN
    IF v_task.status <> 'not_started'::public.task_status THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION: only not_started tasks can move to in_progress'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.tasks
       SET status = 'in_progress'::public.task_status,
           updated_at = now()
     WHERE id = p_task_id;
  ELSIF p_new_status = 'completed'::public.task_status THEN
    IF v_case_is_internal
       AND v_task.status = 'not_started'::public.task_status THEN
      PERFORM public.check_task_prerequisites(p_task_id);

      UPDATE public.tasks
         SET status = 'completed'::public.task_status,
             completed_at = now(),
             completed_by = v_uid,
             updated_at = now()
       WHERE id = p_task_id;

      v_case_completed := public.check_case_completion(v_task.case_id);
    ELSIF v_task.status = 'in_progress'::public.task_status THEN
      PERFORM public.check_task_prerequisites(p_task_id);

      UPDATE public.tasks
         SET status = 'completed'::public.task_status,
             completed_at = now(),
             completed_by = v_uid,
             updated_at = now()
       WHERE id = p_task_id;

      v_case_completed := public.check_case_completion(v_task.case_id);
    ELSE
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION: task must be in progress before completing'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: unsupported target status'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'id', p_task_id,
    'status', p_new_status,
    'updated_at', now(),
    'case_completed', v_case_completed
  );
END;
$$;
