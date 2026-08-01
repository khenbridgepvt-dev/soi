-- Task 8 senior review (ticket 0018, EP-17, ADR-0006).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'senior_revision_alert';


CREATE OR REPLACE FUNCTION public.submit_senior_review(
  p_task_id uuid,
  p_outcome public.senior_review_outcome,
  p_revision_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_case public.cases%ROWTYPE;
  v_task5 public.tasks%ROWTYPE;
  v_role text;
  v_uid uuid := auth.uid();
  v_revision_count integer;
  v_trimmed_notes text;
BEGIN
  v_role := coalesce(public.jwt_role(), '');

  IF v_uid IS NULL OR coalesce(public.is_active_user(), false) = false THEN
    RAISE EXCEPTION 'FORBIDDEN: active session required'
      USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('admin', 'senior') THEN
    RAISE EXCEPTION 'FORBIDDEN: only admin or senior can submit senior review'
      USING ERRCODE = '42501';
  END IF;

  IF p_outcome NOT IN ('approved'::public.senior_review_outcome, 'revisions_required'::public.senior_review_outcome) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: outcome must be approved or revisions_required'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_outcome = 'revisions_required'::public.senior_review_outcome THEN
    v_trimmed_notes := trim(coalesce(p_revision_notes, ''));
    IF v_trimmed_notes = '' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: revision_notes are required when requesting revisions'
        USING ERRCODE = 'P0001';
    END IF;
    IF length(v_trimmed_notes) > 1000 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: revision_notes must be at most 1000 characters'
        USING ERRCODE = 'P0001';
    END IF;
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

  IF v_task.sequence <> 8 OR v_task.is_custom THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: senior review applies to Task 8 only'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_task.status <> 'in_progress'::public.task_status THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Task 8 must be in progress'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_case
    FROM public.cases
   WHERE id = v_task.case_id
     AND is_deleted = false
   FOR UPDATE;

  IF NOT FOUND OR v_case.status NOT IN ('active'::public.case_status) THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: case is read-only'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('lawcrm.senior_review', '1', true);

  IF p_outcome = 'approved'::public.senior_review_outcome THEN
    UPDATE public.tasks
       SET senior_approval = 'approved'::public.senior_review_outcome,
           revision_notes = NULL,
           status = 'completed'::public.task_status,
           completed_at = now(),
           completed_by = v_uid,
           updated_at = now()
     WHERE id = p_task_id;

    PERFORM set_config('lawcrm.senior_review', '', true);

    RETURN jsonb_build_object(
      'id', p_task_id,
      'case_id', v_task.case_id,
      'outcome', 'approved',
      'senior_approval', 'approved',
      'status', 'completed',
      'senior_revision_count', v_case.senior_revision_count,
      'alert_admins', false
    );
  END IF;

  UPDATE public.tasks
     SET senior_approval = 'revisions_required'::public.senior_review_outcome,
         revision_notes = v_trimmed_notes,
         status = 'completed'::public.task_status,
         completed_at = now(),
         completed_by = v_uid,
         updated_at = now()
   WHERE id = p_task_id;

  UPDATE public.cases
     SET senior_revision_count = senior_revision_count + 1,
         updated_at = now()
   WHERE id = v_task.case_id
   RETURNING senior_revision_count INTO v_revision_count;

  SELECT * INTO v_task5
    FROM public.tasks
   WHERE case_id = v_task.case_id
     AND sequence = 5
     AND is_deleted = false
   FOR UPDATE;

  IF FOUND THEN
    UPDATE public.tasks
       SET status = 'in_progress'::public.task_status,
           completed_at = NULL,
           completed_by = NULL,
           updated_at = now()
     WHERE id = v_task5.id;
  END IF;

  PERFORM set_config('lawcrm.senior_review', '', true);

  RETURN jsonb_build_object(
    'id', p_task_id,
    'case_id', v_task.case_id,
    'outcome', 'revisions_required',
    'senior_approval', 'revisions_required',
    'status', 'completed',
    'senior_revision_count', v_revision_count,
    'task5_id', v_task5.id,
    'task5_assigned_to', v_task5.assigned_to,
    'case_reference', v_case.reference,
    'alert_admins', v_revision_count >= 3
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_senior_review(uuid, public.senior_review_outcome, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_senior_review(uuid, public.senior_review_outcome, text) TO authenticated;


-- Allow senior review RPC to increment revision count on cases.
CREATE OR REPLACE FUNCTION public.enforce_cases_column_restrictions()
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

  IF coalesce(current_setting('lawcrm.case_completion', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('lawcrm.senior_review', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF public.jwt_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Permission denied: cannot change id' USING ERRCODE = '42501';
  END IF;
  IF NEW.reference IS DISTINCT FROM OLD.reference THEN
    RAISE EXCEPTION 'Permission denied: cannot change reference' USING ERRCODE = '42501';
  END IF;
  IF NEW.client_first_name IS DISTINCT FROM OLD.client_first_name THEN
    RAISE EXCEPTION 'Permission denied: cannot change client_first_name' USING ERRCODE = '42501';
  END IF;
  IF NEW.client_last_name IS DISTINCT FROM OLD.client_last_name THEN
    RAISE EXCEPTION 'Permission denied: cannot change client_last_name' USING ERRCODE = '42501';
  END IF;
  IF NEW.application_type_id IS DISTINCT FROM OLD.application_type_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change application_type_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Permission denied: cannot change status' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_urgent IS DISTINCT FROM OLD.is_urgent THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_urgent' USING ERRCODE = '42501';
  END IF;
  IF NEW.senior_revision_count IS DISTINCT FROM OLD.senior_revision_count THEN
    RAISE EXCEPTION 'Permission denied: cannot change senior_revision_count' USING ERRCODE = '42501';
  END IF;
  IF NEW.last_date IS DISTINCT FROM OLD.last_date THEN
    RAISE EXCEPTION 'Permission denied: cannot change last_date' USING ERRCODE = '42501';
  END IF;
  IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date THEN
    RAISE EXCEPTION 'Permission denied: cannot change appointment_date' USING ERRCODE = '42501';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Permission denied: cannot change created_by' USING ERRCODE = '42501';
  END IF;
  IF NEW.accepted_at IS DISTINCT FROM OLD.accepted_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change accepted_at' USING ERRCODE = '42501';
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change completed_at' USING ERRCODE = '42501';
  END IF;
  IF NEW.fee_agreement IS DISTINCT FROM OLD.fee_agreement THEN
    RAISE EXCEPTION 'Permission denied: cannot change fee_agreement' USING ERRCODE = '42501';
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
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change created_at' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
