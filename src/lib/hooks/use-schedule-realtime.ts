'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
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
};

/**
 * ADR-0022 §4 / ADR-0003: Realtime on `task_assignments` only (not task board).
 * Invalidates `queryKeys.schedule.*` when assignments change on the viewed day.
 *
 * Fallback: schedule queries keep `refetchInterval: REFETCH_INTERVAL_MS` (60s)
 * when Realtime disconnects — same pattern as notifications (ticket 0027).
 */
export function useScheduleRealtime({
  enabled = true,
  viewedDate,
  userId,
  role = 'admin',
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
      .channel(`schedule-assignments:${userId}:${viewedDate}`)
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
            })
          ) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, viewedDate, userId, role, queryClient]);
}

export { REFETCH_INTERVAL_MS };
