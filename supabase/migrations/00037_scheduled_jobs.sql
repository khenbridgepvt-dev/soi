-- Scheduled jobs support (ticket 0028): DU alert type + notification dedupe keys.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'du_alert';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON public.notifications ((payload->>'dedupe_key'))
  WHERE payload->>'dedupe_key' IS NOT NULL;

-- Cron schedules are registered manually in the Supabase dashboard (ADR-0013):
--   detect-overdue → */15 * * * *  (every 15 minutes)
--   du-alerts      → 0 9 * * *     (daily at 09:00 UTC)
