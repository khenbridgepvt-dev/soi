-- Archive operations: soft-delete, restore, purge (ticket 0030, EP-08/39–41, ADR-0011)

CREATE TYPE public.archive_record_type AS ENUM ('case', 'task', 'dependant');

-- -----------------------------------------------------------------------------
-- EP-08 · Soft-delete case (+ cascade tasks and dependants)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete_case(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_actor uuid := auth.uid();
BEGIN
  IF public.jwt_role() <> 'admin' OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.cases c
     WHERE c.id = p_case_id
       AND c.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Case not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.cases
     SET is_deleted = true,
         deleted_at = v_now,
         deleted_by = v_actor,
         updated_at = v_now
   WHERE id = p_case_id;

  UPDATE public.tasks
     SET is_deleted = true,
         deleted_at = v_now,
         deleted_by = v_actor,
         updated_at = v_now
   WHERE case_id = p_case_id
     AND is_deleted = false;

  UPDATE public.dependants
     SET is_deleted = true,
         deleted_at = v_now,
         deleted_by = v_actor,
         updated_at = v_now
   WHERE case_id = p_case_id
     AND is_deleted = false;

  RETURN json_build_object(
    'id', p_case_id,
    'is_deleted', true,
    'deleted_at', v_now
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- EP-40 · Restore archived record
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restore_archived_record(
  p_id uuid,
  p_type public.archive_record_type
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
BEGIN
  IF public.jwt_role() <> 'admin' OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_type = 'case' THEN
    UPDATE public.cases
       SET is_deleted = false,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = now()
     WHERE id = p_id
       AND is_deleted = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Record not found' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.tasks
       SET is_deleted = false,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = now()
     WHERE case_id = p_id;

    UPDATE public.dependants
       SET is_deleted = false,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = now()
     WHERE case_id = p_id;

    RETURN json_build_object('id', p_id, 'type', 'case', 'is_deleted', false);
  END IF;

  IF p_type = 'task' THEN
    SELECT case_id INTO v_case_id
      FROM public.tasks
     WHERE id = p_id
       AND is_deleted = true;

    IF v_case_id IS NULL THEN
      RAISE EXCEPTION 'Record not found' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.tasks
       SET is_deleted = false,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = now()
     WHERE id = p_id;

    RETURN json_build_object('id', p_id, 'type', 'task', 'is_deleted', false);
  END IF;

  UPDATE public.dependants
     SET is_deleted = false,
         deleted_at = NULL,
         deleted_by = NULL,
         updated_at = now()
   WHERE id = p_id
     AND is_deleted = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN json_build_object('id', p_id, 'type', 'dependant', 'is_deleted', false);
END;
$$;

-- -----------------------------------------------------------------------------
-- EP-41 · Purge expired soft-deleted records (hard delete)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_expired_records(p_retention_days integer DEFAULT 90)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention integer := GREATEST(COALESCE(p_retention_days, 90), 1);
  v_cutoff timestamptz := now() - make_interval(days => v_retention);
  v_case_ids uuid[];
  v_purged_cases integer := 0;
  v_purged_tasks integer := 0;
  v_purged_dependants integer := 0;
  v_orphan_tasks integer := 0;
  v_orphan_dependants integer := 0;
BEGIN
  IF public.jwt_role() <> 'admin' OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_case_ids
    FROM public.cases
   WHERE is_deleted = true
     AND deleted_at IS NOT NULL
     AND deleted_at < v_cutoff;

  DELETE FROM public.cases
   WHERE id = ANY (v_case_ids);

  GET DIAGNOSTICS v_purged_cases = ROW_COUNT;

  DELETE FROM public.tasks t
   WHERE t.is_deleted = true
     AND t.deleted_at IS NOT NULL
     AND t.deleted_at < v_cutoff;

  GET DIAGNOSTICS v_orphan_tasks = ROW_COUNT;
  v_purged_tasks := v_orphan_tasks;

  DELETE FROM public.dependants d
   WHERE d.is_deleted = true
     AND d.deleted_at IS NOT NULL
     AND d.deleted_at < v_cutoff;

  GET DIAGNOSTICS v_orphan_dependants = ROW_COUNT;
  v_purged_dependants := v_orphan_dependants;

  RAISE LOG 'purge_expired_records actor=% retention_days=% purged_cases=% purged_tasks=% purged_dependants=%',
    auth.uid(), v_retention, v_purged_cases, v_purged_tasks, v_purged_dependants;

  RETURN json_build_object(
    'purged_cases', v_purged_cases,
    'purged_tasks', v_purged_tasks,
    'purged_dependants', v_purged_dependants
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_archived_record(uuid, public.archive_record_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_records(integer) TO authenticated;

-- Admin archive read for soft-deleted tasks (§8.3)
CREATE POLICY tasks_select_admin_archived ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = true
  );
