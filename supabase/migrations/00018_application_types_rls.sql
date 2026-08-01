-- application_types RLS (ticket 0010, database_schema §10 pattern)
-- Authenticated read; admin write. Staff/senior see active rows only; admin sees all.

CREATE POLICY application_types_select_authenticated ON public.application_types
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      is_active = true
      OR (SELECT public.jwt_role()) = 'admin'
    )
  );

CREATE POLICY application_types_insert_admin ON public.application_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
  );

CREATE POLICY application_types_update_admin ON public.application_types
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
