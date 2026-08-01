-- Accept-lead atomic transaction (ticket 0013, risk R1).
--
-- Reference generation (database_schema §9.1 + T9 counter UPSERT), the
-- lead_pending → active status flip, and the 13 default task inserts
-- (SRS §3.2, ADR-0002) all happen inside this one function, so a partial
-- failure rolls the whole acceptance back (TC-023). EP-05 calls it via RPC and
-- performs no writes of its own (IMPLEMENTATION_PLAN §A.2 rule 3).
--
-- SECURITY DEFINER because `tasks` is still deny-by-default (its policies land
-- with the checklist in ticket 0016); the admin check below replaces what RLS
-- would otherwise enforce.
--
-- Raised conditions, mapped to HTTP status by the route:
--   42501 FORBIDDEN                  · caller is not an active admin
--   P0002 CASE_NOT_FOUND             · no such live case
--   P0001 INVALID_STATE_TRANSITION   · case is not lead_pending
--   23505 (unique_violation)         · reference collision → transaction rolled back

CREATE OR REPLACE FUNCTION public.accept_lead(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_case public.cases%ROWTYPE;
  v_type_code text;
  v_year_month varchar(4);
  v_sequence integer;
  v_name_segment text;
  v_reference text;
  v_accepted_at timestamptz := now();
  v_tasks_created integer;
BEGIN
  IF coalesce(public.jwt_role(), '') <> 'admin'
     OR coalesce(public.is_active_user(), false) = false THEN
    RAISE EXCEPTION 'FORBIDDEN: only an active admin can accept a lead'
      USING ERRCODE = '42501';
  END IF;

  -- Row lock: two concurrent accepts of the same case serialise here, so the
  -- second one sees status = 'active' and is rejected (TC-033).
  SELECT * INTO v_case
    FROM public.cases
   WHERE id = p_case_id
     AND is_deleted = false
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASE_NOT_FOUND: no live case with id %', p_case_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_case.status <> 'lead_pending'::public.case_status THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: case is %, not lead_pending', v_case.status
      USING ERRCODE = 'P0001';
  END IF;

  SELECT at.code INTO v_type_code
    FROM public.application_types at
   WHERE at.id = v_case.application_type_id;

  IF v_type_code IS NULL THEN
    RAISE EXCEPTION 'CASE_NOT_FOUND: case % has no application type', p_case_id
      USING ERRCODE = 'P0002';
  END IF;

  -- §9.1 step 2–3: MMYY in UTC, then the concurrency-safe counter UPSERT. The
  -- ON CONFLICT branch takes a row lock, so simultaneous accepts in the same
  -- month get distinct sequence numbers (TC-018).
  v_year_month := to_char(timezone('utc', v_accepted_at), 'MMYY');

  INSERT INTO public.reference_counters AS rc (year_month, last_sequence)
  VALUES (v_year_month, 1)
  ON CONFLICT (year_month) DO UPDATE
     SET last_sequence = rc.last_sequence + 1,
         updated_at = now()
  RETURNING rc.last_sequence INTO v_sequence;

  -- §9.1 step 5: first three letters of the first name, short names padded
  -- with X (TC-019). Mirrored by formatNameSegment() in src/lib/utils/reference.ts.
  v_name_segment := rpad(
    upper(
      substring(
        regexp_replace(v_case.client_first_name, '[^[:alpha:]]', '', 'g')
        from 1 for 3
      )
    ),
    3,
    'X'
  );

  v_reference :=
    v_year_month
    || lpad(v_sequence::text, 2, '0')
    || '/' || upper(v_type_code)
    || '/' || v_name_segment;

  UPDATE public.cases
     SET status = 'active'::public.case_status,
         reference = v_reference,
         accepted_at = v_accepted_at
   WHERE id = p_case_id;

  INSERT INTO public.tasks (
    case_id,
    sequence,
    name,
    abbreviation,
    description,
    status,
    is_custom,
    is_urgent
  )
  SELECT
    p_case_id,
    t.sequence,
    t.name,
    t.abbreviation,
    t.description,
    'not_started'::public.task_status,
    false,
    v_case.is_urgent
  FROM (
    VALUES
      (1::smallint, 'CCL (Client Care Letter)', 'CCL',
       'Draft and dispatch the Client Care Letter to the client.'),
      (2::smallint, 'LOA (Letter of Authority)', 'LOA',
       'Draft and dispatch the Letter of Authority to the client.'),
      (3::smallint, 'Send Google Form', 'Form Send',
       'Send the intake form (Google Form) to the client for completion.'),
      (4::smallint, 'Google Form Received', 'Form Recv',
       'Confirm receipt of the completed intake form from the client.'),
      (5::smallint, 'Application Preparation', 'App',
       'Core casework: drafting, compiling information, and preparing the application.'),
      (6::smallint, 'Pending Detail Collection', 'Detail',
       'Follow up with the client for any missing information required for the application.'),
      (7::smallint, 'Review by Client', 'Client Rev',
       'Send the prepared application to the client for review and approval.'),
      (8::smallint, 'Review by Senior', 'Senior Rev',
       'A senior caseworker reviews the application and records the outcome.'),
      (9::smallint, 'Disclaimer Email Sent', 'Disclaimer',
       'Dispatch the disclaimer email to the client after senior approval.'),
      (10::smallint, 'Application Payment', 'Payment',
       'Collect the application payment from the client.'),
      (11::smallint, 'Appointment Booking', 'Appt Book',
       'Book the required appointment (e.g. biometrics).'),
      (12::smallint, 'Document Collection', 'Doc Collect',
       'The client submits all required documents as requested by staff.'),
      (13::smallint, 'Document Review & Upload', 'DU',
       'Review received documents, organise file structures, and upload to the external platform.')
  ) AS t (sequence, name, abbreviation, description);

  GET DIAGNOSTICS v_tasks_created = ROW_COUNT;

  IF v_tasks_created <> 13 THEN
    RAISE EXCEPTION 'TASK_CREATION_FAILED: created % tasks, expected 13', v_tasks_created
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'id', p_case_id,
    'reference', v_reference,
    'status', 'active',
    'accepted_at', v_accepted_at,
    'tasks_created', v_tasks_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_lead(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.accept_lead(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- Leads may only be created as `lead_pending` (0012 review follow-up). Every
-- other status transition is owned by an API route: accept by this function,
-- reject by EP-06, completion by the task lifecycle.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS cases_insert_admin ON public.cases;

CREATE POLICY cases_insert_admin ON public.cases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND status = 'lead_pending'::public.case_status
    AND reference IS NULL
    AND is_deleted = false
  );
