-- Senior review RPC bypass on tasks column trigger (ticket 0018).

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

  IF coalesce(current_setting('lawcrm.senior_review', true), '') = '1' THEN
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
