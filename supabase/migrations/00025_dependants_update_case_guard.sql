-- Tighten dependants_update_admin: writable cases only (ticket 0015 code review).

DROP POLICY IF EXISTS dependants_update_admin ON public.dependants;

CREATE POLICY dependants_update_admin ON public.dependants
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND is_deleted = false
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = dependants.case_id
         AND c.is_deleted = false
         AND c.status IN ('lead_pending'::public.case_status, 'active'::public.case_status)
    )
  )
  WITH CHECK (
    (SELECT public.jwt_role()) = 'admin'
    AND (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1
        FROM public.cases c
       WHERE c.id = dependants.case_id
         AND c.is_deleted = false
         AND c.status IN ('lead_pending'::public.case_status, 'active'::public.case_status)
    )
  );
