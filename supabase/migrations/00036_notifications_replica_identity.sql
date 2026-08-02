-- Filtered Realtime subscriptions require FULL replica identity (ticket 0027).
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
