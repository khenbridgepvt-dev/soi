-- Admin can read soft-deleted dependants (archive + UPDATE RETURNING after EP-11).
-- database_schema §8.3 · ticket 0015 TC-026.

CREATE POLICY dependants_select_admin_soft_deleted ON public.dependants
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = true
  );
