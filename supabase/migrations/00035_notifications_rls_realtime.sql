-- Notifications RLS, §10.3 column trigger, and Realtime publication (ticket 0027).

-- -----------------------------------------------------------------------------
-- §10.2 — users read and update their own notifications only
-- -----------------------------------------------------------------------------

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT public.is_active_user())
  );

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT public.is_active_user())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT public.is_active_user())
  );

-- -----------------------------------------------------------------------------
-- §10.3 — users may change read/acknowledge fields only
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_notifications_column_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;

  IF claims ->> 'role' IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Permission denied: cannot change id' USING ERRCODE = '42501';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change user_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.type IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION 'Permission denied: cannot change type' USING ERRCODE = '42501';
  END IF;
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    RAISE EXCEPTION 'Permission denied: cannot change title' USING ERRCODE = '42501';
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    RAISE EXCEPTION 'Permission denied: cannot change body' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_urgent IS DISTINCT FROM OLD.is_urgent THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_urgent' USING ERRCODE = '42501';
  END IF;
  IF NEW.case_id IS DISTINCT FROM OLD.case_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change case_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.task_id IS DISTINCT FROM OLD.task_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change task_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.payload IS DISTINCT FROM OLD.payload THEN
    RAISE EXCEPTION 'Permission denied: cannot change payload' USING ERRCODE = '42501';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change created_at' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_notifications_columns
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_notifications_column_restrictions();

-- -----------------------------------------------------------------------------
-- ADR-0003 — Realtime INSERT delivery for the notification centre only
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
