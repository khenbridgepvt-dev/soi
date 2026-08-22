'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { REFETCH_INTERVAL_MS } from '@/lib/query/keys';
import {
  shouldInvalidateViewsForTaskChange,
  taskRealtimeQueryKeysToInvalidate,
  type TaskRealtimeRecord,
} from '@/lib/tasks/realtime-invalidation';

type TasksViewerRole = 'admin' | 'staff' | 'senior';

type UseTasksRealtimeOptions = {
  enabled?: boolean;
  userId?: string;
  role?: TasksViewerRole;
};

/**
 * ADR-0023 / ticket 0097: Realtime on `tasks` for status / assignee / overdue changes.
 * Complements `useScheduleRealtime` (0075) on `task_assignments`.
 *
 * Fallback: affected queries keep `refetchInterval: REFETCH_INTERVAL_MS` (60s)
 * when Realtime disconnects — same pattern as notifications (0027) and schedule (0075).
 */
export function useTasksRealtime({
  enabled = true,
  userId,
  role = 'admin',
}: UseTasksRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const supabase = createClient();
    const isStaffViewer = role === 'staff' || role === 'senior';
    const staffFilter = isStaffViewer ? `assigned_to=eq.${userId}` : undefined;

    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`tasks:${userId}:${role}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          ...(staffFilter ? { filter: staffFilter } : {}),
        },
        (payload) => {
          const change = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            record: (payload.new ?? {}) as TaskRealtimeRecord,
            oldRecord: (payload.old ?? undefined) as TaskRealtimeRecord | undefined,
          };

          if (shouldInvalidateViewsForTaskChange(change, { userId, role })) {
            for (const queryKey of taskRealtimeQueryKeysToInvalidate()) {
              void queryClient.invalidateQueries({ queryKey });
            }
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, userId, role, queryClient]);
}

export { REFETCH_INTERVAL_MS };
