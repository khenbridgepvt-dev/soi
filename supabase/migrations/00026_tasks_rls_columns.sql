-- Tasks RLS completion + §10.3 column trigger (ticket 0016).

-- -----------------------------------------------------------------------------
-- §10.3 — staff may update status, notes, blocked_at, blocked_reason only
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
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
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

CREATE TRIGGER enforce_task_columns
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_task_column_restrictions();


-- -----------------------------------------------------------------------------
-- §10.2 — staff update own assigned tasks; admin insert custom tasks (EP-11b)
-- -----------------------------------------------------------------------------

CREATE POLICY tasks_update_staff ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND assigned_to = auth.uid()
  );

CREATE POLICY tasks_insert_admin ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND is_custom = true
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = tasks.case_id
         AND c.is_deleted = false
         AND c.status = 'active'::public.case_status
    )
  );


-- -----------------------------------------------------------------------------
-- Max 5 custom tasks per case (EP-11b, ADR-0002) — enforced at DB for integrity
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_custom_task_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  custom_count integer;
BEGIN
  IF NEW.is_custom = false OR NEW.is_deleted = true THEN
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

CREATE TRIGGER enforce_custom_task_limit
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_custom_task_limit();
