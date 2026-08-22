'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { refetchActiveTaskViewQueries } from '@/lib/query/refetch-views';
import { REFETCH_INTERVAL_MS } from '@/lib/query/keys';
import {
  shouldInvalidateScheduleForAssignmentChange,
  type TaskAssignmentRealtimeRecord,
} from '@/lib/schedule/realtime-invalidation';

type ScheduleViewerRole = 'admin' | 'staff' | 'senior';

type UseScheduleRealtimeOptions = {
  enabled?: boolean;
  viewedDate: string;
  userId?: string;
  role?: ScheduleViewerRole;
  /** Staff My Tasks: refetch on any assignment for this user, not only viewedDate. */
  ignoreViewedDate?: boolean;
};

/**
 * ADR-0022 §4 / ADR-0003: Realtime on `task_assignments`.
 * Refetches active schedule + staff task views on assignment changes (0109, 0110b).
 *
 * Fallback: views using `refetchInterval` (schedule 15s, My tasks 15s) when Realtime disconnects.
 */
export function useScheduleRealtime({
  enabled = true,
  viewedDate,
  userId,
  role = 'admin',
  ignoreViewedDate = false,
}: UseScheduleRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId || !viewedDate) {
      return;
    }

    const supabase = createClient();
    const isStaffViewer = role === 'staff' || role === 'senior';
    const staffFilter = isStaffViewer ? `staff_id=eq.${userId}` : undefined;

    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`schedule-assignments:${userId}:${viewedDate}:${ignoreViewedDate ? 'all' : 'day'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
          ...(staffFilter ? { filter: staffFilter } : {}),
        },
        (payload) => {
          const change = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            record: (payload.new ?? {}) as TaskAssignmentRealtimeRecord,
            oldRecord: (payload.old ?? undefined) as TaskAssignmentRealtimeRecord | undefined,
          };

          if (
            shouldInvalidateScheduleForAssignmentChange(change, {
              viewedDate,
              staffId: isStaffViewer ? userId : undefined,
              ignoreViewedDate: isStaffViewer && ignoreViewedDate,
            })
          ) {
            void refetchActiveTaskViewQueries(queryClient);
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, viewedDate, userId, role, ignoreViewedDate, queryClient]);
}

export { REFETCH_INTERVAL_MS };
