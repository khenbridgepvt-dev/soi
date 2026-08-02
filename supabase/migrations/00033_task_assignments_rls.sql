-- task_assignments RLS (ticket 0021, database_schema §10.2)
-- Admin full access; staff/senior read their own slots only (ADR-0010 — staff
-- never see another person's schedule).
--
-- No §10.3 column trigger here: staff hold SELECT only, so there is no write
-- path whose columns would need restricting. Ticket 0022 adds the admin insert
-- flow; the `no_overlap` exclusion constraint from 00007 remains the last line
-- of defence against double-booking.

CREATE POLICY task_assignments_all_admin ON public.task_assignments
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  )
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY task_assignments_select_own ON public.task_assignments
  FOR SELECT
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
    AND (SELECT public.is_active_user())
  );
