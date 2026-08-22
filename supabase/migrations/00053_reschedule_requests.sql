-- Reschedule requests (ticket 0077, ADR-0022 §6).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'reschedule_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'reschedule_response';

CREATE TYPE public.reschedule_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TABLE public.reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.task_assignments (id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles (id),
  proposed_date date NOT NULL,
  proposed_start_time time NOT NULL,
  proposed_duration_minutes integer NOT NULL CHECK (proposed_duration_minutes >= 15),
  status public.reschedule_request_status NOT NULL DEFAULT 'pending',
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles (id)
);

CREATE UNIQUE INDEX idx_reschedule_requests_pending_assignment
  ON public.reschedule_requests (assignment_id)
  WHERE status = 'pending';

CREATE INDEX idx_reschedule_requests_requested_by
  ON public.reschedule_requests (requested_by, created_at DESC);

ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY reschedule_requests_select_own ON public.reschedule_requests
  FOR SELECT
  TO authenticated
  USING (
    requested_by = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
  );

CREATE POLICY reschedule_requests_select_admin ON public.reschedule_requests
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY reschedule_requests_insert_own ON public.reschedule_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
    AND (SELECT public.jwt_role()) IN ('staff', 'senior')
  );

COMMENT ON TABLE public.reschedule_requests IS
  'Staff-initiated reschedule proposals; admin approve/reject in ticket 0078.';
