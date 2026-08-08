-- Ticket 0055: case document preparations (ADR-0021) — table + RLS mirroring case access.

CREATE TABLE public.case_document_preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('covering_letter', 'parental_consent')),
  variant_id text NOT NULL,
  wizard_schema_id text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  merged_text text NOT NULL DEFAULT '',
  merged_html text,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  updated_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_document_preparations_case_kind_unique UNIQUE (case_id, kind)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.case_document_preparations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.case_document_preparations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- SELECT — admin (active + archived cases) and assigned staff
-- -----------------------------------------------------------------------------

CREATE POLICY case_document_preparations_select_admin_active
  ON public.case_document_preparations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = case_document_preparations.case_id
         AND c.is_deleted = false
    )
  );

CREATE POLICY case_document_preparations_select_admin_archived
  ON public.case_document_preparations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = case_document_preparations.case_id
         AND c.is_deleted = true
    )
  );

CREATE POLICY case_document_preparations_select_staff
  ON public.case_document_preparations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  );

-- -----------------------------------------------------------------------------
-- INSERT / UPDATE — admin on writable non-deleted cases; staff on assigned cases
-- -----------------------------------------------------------------------------

CREATE POLICY case_document_preparations_insert_admin
  ON public.case_document_preparations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = case_document_preparations.case_id
         AND c.is_deleted = false
         AND c.status IN (
           'lead_pending'::public.case_status,
           'active'::public.case_status
         )
    )
  );

CREATE POLICY case_document_preparations_update_admin
  ON public.case_document_preparations
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = case_document_preparations.case_id
         AND c.is_deleted = false
         AND c.status IN (
           'lead_pending'::public.case_status,
           'active'::public.case_status
         )
    )
  )
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = case_document_preparations.case_id
         AND c.is_deleted = false
         AND c.status IN (
           'lead_pending'::public.case_status,
           'active'::public.case_status
         )
    )
  );

CREATE POLICY case_document_preparations_insert_staff
  ON public.case_document_preparations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  );

CREATE POLICY case_document_preparations_update_staff
  ON public.case_document_preparations
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  )
  WITH CHECK (
    (SELECT public.jwt_role()) IN ('staff', 'senior')
    AND (SELECT public.is_active_user())
    AND case_id IN (SELECT public.staff_assigned_active_case_ids())
  );

GRANT SELECT, INSERT, UPDATE ON public.case_document_preparations TO authenticated;
GRANT ALL ON public.case_document_preparations TO service_role;
