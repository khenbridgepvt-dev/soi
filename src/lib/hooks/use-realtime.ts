'use client';

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';

type UseRealtimeOptions = {
  userId?: string;
  onNotificationInsert?: (notification: NotificationRecord) => void;
};

const RESUBSCRIBE_STATUSES = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

/**
 * ADR-0003: one Realtime channel per client, notifications INSERT only.
 * Resubscribes on channel errors (0110a). Callback held in a ref to avoid channel churn.
 */
export function useRealtime({ userId, onNotificationInsert }: UseRealtimeOptions) {
  const onInsertRef = useRef(onNotificationInsert);
  onInsertRef.current = onNotificationInsert;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let resubscribeTimer: ReturnType<typeof setTimeout> | null = null;

    function clearResubscribeTimer() {
      if (resubscribeTimer) {
        clearTimeout(resubscribeTimer);
        resubscribeTimer = null;
      }
    }

    function subscribe() {
      if (cancelled) {
        return;
      }

      clearResubscribeTimer();

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            onInsertRef.current?.(payload.new as NotificationRecord);
          },
        )
        .subscribe((status) => {
          if (cancelled || !RESUBSCRIBE_STATUSES.has(status)) {
            return;
          }

          clearResubscribeTimer();
          resubscribeTimer = setTimeout(() => {
            subscribe();
          }, 1_000);
        });
    }

    subscribe();

    return () => {
      cancelled = true;
      clearResubscribeTimer();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId]);
}
