-- Task status machine (ticket 0017): prerequisite + completion checks, update RPC,
-- allow completion metadata on status transition.

-- -----------------------------------------------------------------------------
-- check_task_prerequisites — database_schema §9.1
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_task_prerequisites(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_missing text := '';
BEGIN
  SELECT * INTO v_task
    FROM public.tasks
   WHERE id = p_task_id
     AND is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: task % not found', p_task_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_task.is_custom THEN
    RETURN;
  END IF;

  IF v_task.sequence = 9 THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.tasks t8
       WHERE t8.case_id = v_task.case_id
         AND t8.sequence = 8
         AND t8.is_deleted = false
         AND t8.senior_approval = 'approved'::public.senior_review_outcome
    ) THEN
      RAISE EXCEPTION 'PREREQUISITE_NOT_MET: Task 8 must be approved by a senior reviewer.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_task.sequence = 10 THEN
  SELECT string_agg(
           format('%s (%s)', t.sequence, t.abbreviation),
           ', '
           ORDER BY t.sequence
         )
    INTO v_missing
    FROM public.tasks t
   WHERE t.case_id = v_task.case_id
     AND t.is_deleted = false
     AND t.sequence IN (1, 2, 9)
     AND t.status <> 'completed'::public.task_status;

    IF v_missing IS NOT NULL AND v_missing <> '' THEN
      RAISE EXCEPTION
        'PREREQUISITE_NOT_MET: Tasks 1 (CCL), 2 (LOA), and 9 (Disclaimer) must be completed first.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- check_case_completion — database_schema §9.1
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_case_completion(p_case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.tasks t
     WHERE t.case_id = p_case_id
       AND t.is_deleted = false
       AND t.status <> 'completed'::public.task_status
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.cases
     SET status = 'completed'::public.case_status,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_case_id
     AND is_deleted = false
     AND status = 'active'::public.case_status;

  RETURN FOUND;
END;
$$;


-- -----------------------------------------------------------------------------
-- update_task_status — EP-12 atomic path (completion metadata + case flip)
-- -----------------------------------------------------------------------------

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
    IF v_task.status <> 'in_progress'::public.task_status THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION: task must be in progress before completing'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM public.check_task_prerequisites(p_task_id);

    UPDATE public.tasks
       SET status = 'completed'::public.task_status,
           completed_at = now(),
           completed_by = v_uid,
           updated_at = now()
     WHERE id = p_task_id;

    v_case_completed := public.check_case_completion(v_task.case_id);
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

REVOKE ALL ON FUNCTION public.check_task_prerequisites(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_case_completion(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.update_task_status(uuid, public.task_status) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.check_task_prerequisites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_case_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_task_status(uuid, public.task_status) TO authenticated;


-- -----------------------------------------------------------------------------
-- §10.3 — allow completed_at/completed_by when marking a task complete
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_task_column_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;

  IF claims ->> 'role' IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF public.jwt_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed'::public.task_status
     AND OLD.status IS DISTINCT FROM 'completed'::public.task_status THEN
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'Permission denied: cannot change id' USING ERRCODE = '42501';
    END IF;
    IF OLD.case_id IS DISTINCT FROM NEW.case_id THEN
      RAISE EXCEPTION 'Permission denied: cannot change case_id' USING ERRCODE = '42501';
    END IF;
    IF OLD.sequence IS DISTINCT FROM NEW.sequence THEN
      RAISE EXCEPTION 'Permission denied: cannot change sequence' USING ERRCODE = '42501';
    END IF;
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      RAISE EXCEPTION 'Permission denied: cannot change name' USING ERRCODE = '42501';
    END IF;
    IF OLD.abbreviation IS DISTINCT FROM NEW.abbreviation THEN
      RAISE EXCEPTION 'Permission denied: cannot change abbreviation' USING ERRCODE = '42501';
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      RAISE EXCEPTION 'Permission denied: cannot change description' USING ERRCODE = '42501';
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      RAISE EXCEPTION 'Permission denied: cannot change assigned_to' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
      RAISE EXCEPTION 'Permission denied: cannot change is_deleted' USING ERRCODE = '42501';
    END IF;
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      RAISE EXCEPTION 'Permission denied: cannot change deleted_at' USING ERRCODE = '42501';
    END IF;
    IF OLD.deleted_by IS DISTINCT FROM NEW.deleted_by THEN
      RAISE EXCEPTION 'Permission denied: cannot change deleted_by' USING ERRCODE = '42501';
    END IF;
    IF OLD.senior_approval IS DISTINCT FROM NEW.senior_approval THEN
      RAISE EXCEPTION 'Permission denied: cannot change senior_approval' USING ERRCODE = '42501';
    END IF;
    IF OLD.revision_notes IS DISTINCT FROM NEW.revision_notes THEN
      RAISE EXCEPTION 'Permission denied: cannot change revision_notes' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_urgent IS DISTINCT FROM NEW.is_urgent THEN
      RAISE EXCEPTION 'Permission denied: cannot change is_urgent' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_overdue IS DISTINCT FROM NEW.is_overdue THEN
      RAISE EXCEPTION 'Permission denied: cannot change is_overdue' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_custom IS DISTINCT FROM NEW.is_custom THEN
      RAISE EXCEPTION 'Permission denied: cannot change is_custom' USING ERRCODE = '42501';
    END IF;
    IF OLD.priority_position IS DISTINCT FROM NEW.priority_position THEN
      RAISE EXCEPTION 'Permission denied: cannot change priority_position' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_overtime IS DISTINCT FROM NEW.is_overtime THEN
      RAISE EXCEPTION 'Permission denied: cannot change is_overtime' USING ERRCODE = '42501';
    END IF;
    IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Permission denied: cannot change created_at' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Permission denied: cannot change id' USING ERRCODE = '42501';
  END IF;
  IF NEW.case_id IS DISTINCT FROM OLD.case_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change case_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.sequence IS DISTINCT FROM OLD.sequence THEN
    RAISE EXCEPTION 'Permission denied: cannot change sequence' USING ERRCODE = '42501';
  END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'Permission denied: cannot change name' USING ERRCODE = '42501';
  END IF;
  IF NEW.abbreviation IS DISTINCT FROM OLD.abbreviation THEN
    RAISE EXCEPTION 'Permission denied: cannot change abbreviation' USING ERRCODE = '42501';
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    RAISE EXCEPTION 'Permission denied: cannot change description' USING ERRCODE = '42501';
  END IF;
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    RAISE EXCEPTION 'Permission denied: cannot change assigned_to' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_deleted' USING ERRCODE = '42501';
  END IF;
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change deleted_at' USING ERRCODE = '42501';
  END IF;
  IF NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN
    RAISE EXCEPTION 'Permission denied: cannot change deleted_by' USING ERRCODE = '42501';
  END IF;
  IF NEW.senior_approval IS DISTINCT FROM OLD.senior_approval THEN
    RAISE EXCEPTION 'Permission denied: cannot change senior_approval' USING ERRCODE = '42501';
  END IF;
  IF NEW.revision_notes IS DISTINCT FROM OLD.revision_notes THEN
    RAISE EXCEPTION 'Permission denied: cannot change revision_notes' USING ERRCODE = '42501';
  END IF;
  IF NEW.completed_by IS DISTINCT FROM OLD.completed_by THEN
    RAISE EXCEPTION 'Permission denied: cannot change completed_by' USING ERRCODE = '42501';
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change completed_at' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_urgent IS DISTINCT FROM OLD.is_urgent THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_urgent' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_overdue IS DISTINCT FROM OLD.is_overdue THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_overdue' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_custom IS DISTINCT FROM OLD.is_custom THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_custom' USING ERRCODE = '42501';
  END IF;
  IF NEW.priority_position IS DISTINCT FROM OLD.priority_position THEN
    RAISE EXCEPTION 'Permission denied: cannot change priority_position' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_overtime IS DISTINCT FROM OLD.is_overtime THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_overtime' USING ERRCODE = '42501';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change created_at' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
