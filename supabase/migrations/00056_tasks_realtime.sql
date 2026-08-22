-- Realtime publication for tasks (ticket 0097, ADR-0023).
-- Staff receive assigned-row events via RLS + client filter; admin receives broader updates.

ALTER TABLE public.tasks REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
