-- Case detail core (ticket 0014): immutability triggers, reference edit RPC,
-- tasks SELECT policies for EP-03.

-- -----------------------------------------------------------------------------
-- §10.3 immutability — last_date and appointment_date cannot be cleared once set
-- (database_schema T3, scope_matrix M10). Applies to every role including admin.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_cases_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.last_date IS NOT NULL AND NEW.last_date IS NULL THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: last_date cannot be cleared once set'
      USING ERRCODE = 'P0001';
  END IF;

  IF OLD.appointment_date IS NOT NULL AND NEW.appointment_date IS NULL THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: appointment_date cannot be cleared once set'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_cases_immutability
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cases_immutability();


-- -----------------------------------------------------------------------------
-- ADR-0009 reference edit — admin-only RPC with counter sync in one transaction
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.edit_case_reference(
  p_case_id uuid,
  p_new_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_case public.cases%ROWTYPE;
  v_trimmed text;
  v_match text[];
  v_year_month varchar(4);
  v_type_code text;
  v_name_segment text;
  v_requested_sequence integer;
  v_final_sequence integer;
  v_final_reference text;
  v_adjusted boolean := false;
  v_used_sequence integer;
BEGIN
  IF coalesce(public.jwt_role(), '') <> 'admin'
     OR coalesce(public.is_active_user(), false) = false THEN
    RAISE EXCEPTION 'FORBIDDEN: only an active admin can edit a case reference'
      USING ERRCODE = '42501';
  END IF;

  v_trimmed := trim(p_new_reference);

  IF v_trimmed IS NULL OR v_trimmed = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: reference is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_case
    FROM public.cases
   WHERE id = p_case_id
     AND is_deleted = false
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASE_NOT_FOUND: no live case with id %', p_case_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_case.reference IS NULL THEN
    RAISE EXCEPTION 'INVALID_STATE: reference can only be edited after acceptance'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_trimmed = v_case.reference THEN
    RETURN jsonb_build_object(
      'reference', v_case.reference,
      'adjusted', false,
      'requested_reference', v_trimmed
    );
  END IF;

  -- ADR-0009 rule 1: full reference uniqueness
  IF EXISTS (
    SELECT 1
      FROM public.cases c
     WHERE c.is_deleted = false
       AND c.id <> p_case_id
       AND c.reference = v_trimmed
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_REFERENCE: reference % is already in use', v_trimmed
      USING ERRCODE = '23505';
  END IF;

  v_match := regexp_match(
    v_trimmed,
  '^(\d{4})(\d{2,})/([A-Z]{3})/([[:alpha:]]{3})$'
  );

  IF v_match IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: reference format must be MMYYNO/TYPE/ABC'
      USING ERRCODE = 'P0001';
  END IF;

  v_year_month := v_match[1];
  v_requested_sequence := v_match[2]::integer;
  v_type_code := v_match[3];
  v_name_segment := upper(v_match[4]);
  v_final_sequence := v_requested_sequence;

  -- ADR-0009 rule 2: if the sequence is taken, assign the next available number
  LOOP
    SELECT (regexp_match(c.reference, '^' || v_year_month || '(\d{2,})/'))[1]::integer
      INTO v_used_sequence
      FROM public.cases c
     WHERE c.is_deleted = false
       AND c.id <> p_case_id
       AND c.reference IS NOT NULL
       AND c.reference ~ ('^' || v_year_month || '\d{2,}/')
       AND (regexp_match(c.reference, '^' || v_year_month || '(\d{2,})/'))[1]::integer = v_final_sequence
     LIMIT 1;

    IF v_used_sequence IS NULL THEN
      EXIT;
    END IF;

    v_final_sequence := v_final_sequence + 1;
    v_adjusted := true;
  END LOOP;

  v_final_reference :=
    v_year_month
    || lpad(v_final_sequence::text, 2, '0')
    || '/' || v_type_code
    || '/' || v_name_segment;

  IF v_final_reference <> v_trimmed AND v_adjusted = false THEN
    v_adjusted := true;
  END IF;

  IF v_final_reference <> v_trimmed THEN
    -- Re-check uniqueness after sequence adjustment
    IF EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.is_deleted = false
         AND c.id <> p_case_id
         AND c.reference = v_final_reference
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_REFERENCE: adjusted reference % is already in use', v_final_reference
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- ADR-0009 rule 3: keep the monthly counter ahead of the highest used sequence
  INSERT INTO public.reference_counters AS rc (year_month, last_sequence)
  VALUES (v_year_month, v_final_sequence)
  ON CONFLICT (year_month) DO UPDATE
     SET last_sequence = GREATEST(rc.last_sequence, EXCLUDED.last_sequence),
         updated_at = now();

  UPDATE public.cases
     SET reference = v_final_reference
   WHERE id = p_case_id;

  RETURN jsonb_build_object(
    'reference', v_final_reference,
    'adjusted', v_adjusted,
    'requested_reference', v_trimmed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edit_case_reference(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.edit_case_reference(uuid, text) TO authenticated;


-- -----------------------------------------------------------------------------
-- tasks SELECT policies — EP-03 returns the task list for case detail (0014).
-- Full task policies + column trigger land with the checklist in ticket 0016.
-- -----------------------------------------------------------------------------

CREATE POLICY tasks_select_admin ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = tasks.case_id
         AND c.is_deleted = false
    )
  );

CREATE POLICY tasks_select_staff ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  );
