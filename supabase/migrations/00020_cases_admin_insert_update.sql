-- Admin create lead + reject status updates (ticket 0012, EP-01/EP-06)

CREATE POLICY cases_insert_admin ON public.cases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY cases_update_admin ON public.cases
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = false
  )
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );
