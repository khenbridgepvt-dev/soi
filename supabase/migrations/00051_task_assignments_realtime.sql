-- Realtime publication for task_assignments (ticket 0075, ADR-0022 §4, ADR-0003).
-- Staff receive own-row events via RLS + client filter; admin receives all rows.

ALTER TABLE public.task_assignments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;
