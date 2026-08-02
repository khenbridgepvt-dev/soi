'use client';

import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';

type UseRealtimeOptions = {
  userId?: string;
  onNotificationInsert?: (notification: NotificationRecord) => void;
};

/**
 * ADR-0003: one Realtime channel per client, notifications INSERT only.
 */
export function useRealtime({ userId, onNotificationInsert }: UseRealtimeOptions) {
  useEffect(() => {
    if (!userId || !onNotificationInsert) {
      return;
    }

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

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
          onNotificationInsert(payload.new as NotificationRecord);
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, onNotificationInsert]);
}
