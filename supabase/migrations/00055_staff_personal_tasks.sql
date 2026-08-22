-- Staff personal tasks (ticket 0079, ADR-0022 §7).
-- Separate table keeps the 13-task lifecycle checklist clean.

CREATE TABLE public.staff_personal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  title text NOT NULL,
  notes text,
  case_id uuid REFERENCES public.cases (id) ON DELETE SET NULL,
  reminder_date date,
  reminder_note text,
  deadline_date date,
  remind_days_before smallint,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_personal_tasks_title_nonempty_check
    CHECK (char_length(trim(title)) > 0),
  CONSTRAINT staff_personal_tasks_title_length_check
    CHECK (char_length(title) <= 200),
  CONSTRAINT staff_personal_tasks_notes_length_check
    CHECK (notes IS NULL OR char_length(notes) <= 500),
  CONSTRAINT staff_personal_tasks_reminder_note_length_check
    CHECK (reminder_note IS NULL OR char_length(reminder_note) <= 500),
  CONSTRAINT staff_personal_tasks_remind_days_before_nonneg_check
    CHECK (remind_days_before IS NULL OR remind_days_before >= 0)
);

CREATE INDEX idx_staff_personal_tasks_created_by
  ON public.staff_personal_tasks (created_by, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX idx_staff_personal_tasks_case_id
  ON public.staff_personal_tasks (case_id)
  WHERE case_id IS NOT NULL AND is_deleted = false;

CREATE INDEX idx_staff_personal_tasks_reminder_date_open
  ON public.staff_personal_tasks (reminder_date)
  WHERE reminder_date IS NOT NULL AND is_deleted = false;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.staff_personal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.validate_staff_personal_task_case_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_internal_case_id constant uuid := 'f0000000-0000-4000-8000-000000000001';
BEGIN
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.case_id = v_internal_case_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.cases c
     WHERE c.id = NEW.case_id
       AND c.is_deleted = false
       AND c.status = 'active'
       AND c.is_internal = false
  ) THEN
    RAISE EXCEPTION 'case_id must reference an active client case'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.case_id NOT IN (SELECT public.staff_assigned_active_case_ids()) THEN
    RAISE EXCEPTION 'You may only link personal tasks to cases you are assigned to'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_personal_tasks_validate_case_link
  BEFORE INSERT OR UPDATE OF case_id ON public.staff_personal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_staff_personal_task_case_link();

ALTER TABLE public.staff_personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_personal_tasks_select_own ON public.staff_personal_tasks
  FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
    AND (SELECT public.jwt_role()) IN ('staff', 'senior')
  );

CREATE POLICY staff_personal_tasks_select_admin ON public.staff_personal_tasks
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY staff_personal_tasks_insert_own ON public.staff_personal_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
    AND (SELECT public.jwt_role()) IN ('staff', 'senior')
  );

CREATE POLICY staff_personal_tasks_update_own ON public.staff_personal_tasks
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
    AND (SELECT public.jwt_role()) IN ('staff', 'senior')
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
    AND (SELECT public.jwt_role()) IN ('staff', 'senior')
  );

COMMENT ON TABLE public.staff_personal_tasks IS
  'Staff ad-hoc personal tasks outside the 13-task checklist (ADR-0022 §7). Scheduling in ticket 0080.';
