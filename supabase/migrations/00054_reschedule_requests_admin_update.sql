-- Admin can resolve pending reschedule requests (ticket 0078).

CREATE POLICY reschedule_requests_update_admin ON public.reschedule_requests
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
