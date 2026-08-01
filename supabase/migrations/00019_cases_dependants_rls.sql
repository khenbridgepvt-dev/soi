-- cases + dependants RLS (ticket 0011, database_schema §10.2/10.3)

-- Subqueries on `tasks` inside policies run as the caller; with tasks still
-- deny-by-default, staff would see zero cases until ticket 0014. SECURITY
-- DEFINER helper matches the profiles `is_active_user()` pattern.
CREATE OR REPLACE FUNCTION public.staff_assigned_active_case_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id
    FROM public.cases c
   WHERE c.is_deleted = false
     AND c.status = 'active'
     AND EXISTS (
       SELECT 1
         FROM public.tasks t
        WHERE t.case_id = c.id
          AND t.assigned_to = auth.uid()
          AND t.is_deleted = false
     );
$$;

GRANT EXECUTE ON FUNCTION public.staff_assigned_active_case_ids() TO authenticated;

-- -----------------------------------------------------------------------------
-- cases policies
-- -----------------------------------------------------------------------------

CREATE POLICY cases_select_admin_active ON public.cases
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = false
  );

CREATE POLICY cases_select_admin_archived ON public.cases
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = true
  );

CREATE POLICY cases_select_staff ON public.cases
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND id IN (SELECT public.staff_assigned_active_case_ids())
  );

CREATE POLICY cases_update_staff ON public.cases
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND id IN (SELECT public.staff_assigned_active_case_ids())
  )
  WITH CHECK (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND id IN (SELECT public.staff_assigned_active_case_ids())
  );


-- -----------------------------------------------------------------------------
-- dependants policies (access follows parent case)
-- -----------------------------------------------------------------------------

CREATE POLICY dependants_select_admin_active ON public.dependants
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = dependants.case_id
         AND c.is_deleted = false
    )
  );

CREATE POLICY dependants_select_admin_archived ON public.dependants
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = dependants.case_id
         AND c.is_deleted = true
    )
  );

CREATE POLICY dependants_select_staff ON public.dependants
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  );


-- -----------------------------------------------------------------------------
-- §10.3 column restrictions on cases — staff may update `notes` only
-- -----------------------------------------------------------------------------

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

CREATE TRIGGER enforce_cases_columns
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cases_column_restrictions();
