-- Dependants write + tasks admin update for ticket 0015 (EP-07, EP-09–11).

CREATE POLICY dependants_insert_admin ON public.dependants
  FOR INSERT
  TO authenticated
  WITH CHECK (
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
  );

CREATE POLICY dependants_update_admin ON public.dependants
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

-- EP-07 cascades is_urgent to all tasks on the case (admin path).
CREATE POLICY tasks_update_admin ON public.tasks
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
