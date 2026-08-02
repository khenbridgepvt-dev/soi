-- staff_timetables RLS (ticket 0020, ADR-0010, database_schema §10.4)
-- Admin read/write all; staff/senior read own timetable only.

CREATE POLICY staff_timetables_select_admin ON public.staff_timetables
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY staff_timetables_select_own ON public.staff_timetables
  FOR SELECT
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
  );

CREATE POLICY staff_timetables_update_admin ON public.staff_timetables
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  )
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );
