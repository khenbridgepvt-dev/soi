-- Allow check_case_completion to flip case status under staff JWT (ticket 0017).

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
