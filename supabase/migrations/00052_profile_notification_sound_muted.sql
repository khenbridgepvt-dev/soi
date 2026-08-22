-- Notification sound preference on profiles (ticket 0076, ADR-0022 §5).

ALTER TABLE public.profiles
  ADD COLUMN notification_sound_muted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.notification_sound_muted IS
  'When true, skip Web Audio on notification INSERT; toast and bell badge still work.';
