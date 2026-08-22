-- Admin notification when staff complete firm tasks (ticket 0098, ADR-0023).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_status_changed';
