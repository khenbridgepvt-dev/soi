-- Ticket 0071: per-task reminder and deadline columns (ADR-0022).

ALTER TABLE public.tasks
  ADD COLUMN reminder_date date,
  ADD COLUMN reminder_note text,
  ADD COLUMN deadline_date date,
  ADD COLUMN remind_days_before smallint;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_reminder_note_length_check
    CHECK (reminder_note IS NULL OR length(reminder_note) <= 500),
  ADD CONSTRAINT tasks_remind_days_before_nonneg_check
    CHECK (remind_days_before IS NULL OR remind_days_before >= 0);

CREATE INDEX idx_tasks_reminder_date_open
  ON public.tasks (reminder_date)
  WHERE reminder_date IS NOT NULL
    AND status <> 'completed'
    AND is_deleted = false;

COMMENT ON COLUMN public.tasks.reminder_date IS
  'Date the task reminder surfaces on Reminders list and calendar (ADR-0022).';
COMMENT ON COLUMN public.tasks.reminder_note IS
  'Optional note shown with the reminder (max 500 chars).';
COMMENT ON COLUMN public.tasks.deadline_date IS
  'Optional hard deadline; pairs with remind_days_before for approaching warnings.';
COMMENT ON COLUMN public.tasks.remind_days_before IS
  'Days before deadline_date to enter approaching state; NULL disables deadline warning window.';
