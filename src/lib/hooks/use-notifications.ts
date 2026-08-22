'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';
import { useRealtime } from '@/lib/hooks/use-realtime';
import {
  formatNotificationToast,
  shouldPlayNotificationSound,
  shouldShowNotificationToast,
} from '@/lib/notifications/notification-toast';
import { playNotificationSound } from '@/lib/notifications/play-notification-sound';
import {
  registerNotificationRefetch,
  unregisterNotificationRefetch,
} from '@/lib/query/notification-refetch';

type NotificationTab = 'all' | 'unread';

type NotificationState = {
  items: NotificationRecord[];
  unreadCount: number;
  urgentUnreadCount: number;
  loading: boolean;
  error: string | null;
};

type ApiListResponse = {
  data?: NotificationRecord[];
  unread_count?: number;
  urgent_unread_count?: number;
  error?: { message?: string };
};

const INITIAL_STATE: NotificationState = {
  items: [],
  unreadCount: 0,
  urgentUnreadCount: 0,
  loading: true,
  error: null,
};

function mergeFetchedItems(
  fetched: NotificationRecord[],
  current: NotificationRecord[],
  tab: NotificationTab,
): NotificationRecord[] {
  const fetchedIds = new Set(fetched.map((row) => row.id));
  const extras = current.filter((row) => !fetchedIds.has(row.id));
  const merged = [...extras, ...fetched].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );

  return tab === 'unread' ? merged.filter((row) => !row.is_read) : merged;
}

function applyReadLocally(
  items: NotificationRecord[],
  notificationId: string,
  tab: NotificationTab,
  updated?: NotificationRecord,
): NotificationRecord[] {
  if (tab === 'unread') {
    return items.filter((item) => item.id !== notificationId);
  }

  return items.map((item) =>
    item.id === notificationId
      ? updated ?? { ...item, is_read: true, read_at: new Date().toISOString() }
      : item,
  );
}

export function useNotifications(userId?: string) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationTab>('unread');
  const [state, setState] = useState<NotificationState>(INITIAL_STATE);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const fetchGeneration = useRef(0);
  const openRef = useRef(open);
  const soundMutedRef = useRef(false);

  openRef.current = open;

  const loadNotifications = useCallback(
    async (activeTab: NotificationTab) => {
      if (!userId) {
        return;
      }

      const generation = ++fetchGeneration.current;

      setState((current) => ({ ...current, loading: true, error: null }));

      const params = new URLSearchParams({ limit: '50' });
      if (activeTab === 'unread') {
        params.set('is_read', 'false');
      }

      try {
        const response = await fetch(`/api/notifications?${params.toString()}`);
        const json = (await response.json()) as ApiListResponse;

        if (generation !== fetchGeneration.current) {
          return;
        }

        if (!response.ok || !json.data) {
          setState((current) => ({
            ...current,
            loading: false,
            error: json.error?.message ?? 'Failed to load notifications.',
          }));
          return;
        }

        setState((current) => ({
          items: mergeFetchedItems(json.data!, current.items, activeTab),
          unreadCount: json.unread_count ?? 0,
          urgentUnreadCount: json.urgent_unread_count ?? 0,
          loading: false,
          error: null,
        }));
      } catch {
        if (generation !== fetchGeneration.current) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: 'Unable to connect. Check your internet connection.',
        }));
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    void loadNotifications(tab);
  }, [userId, tab, loadNotifications]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch('/api/profile');
        const json = (await response.json()) as {
          data?: { notification_sound_muted: boolean };
        };

        if (!cancelled && response.ok && json.data) {
          soundMutedRef.current = json.data.notification_sound_muted;
        }
      } catch {
        // Keep default (sound on) when preferences cannot be loaded.
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    registerNotificationRefetch(() => loadNotifications(tab));
    return () => unregisterNotificationRefetch();
  }, [userId, tab, loadNotifications]);

  const handleInsert = useCallback(
    (notification: NotificationRecord) => {
      setState((current) => ({
        ...current,
        items:
          tab === 'unread' && notification.is_read
            ? current.items
            : [notification, ...current.items.filter((item) => item.id !== notification.id)],
        unreadCount: notification.is_read ? current.unreadCount : current.unreadCount + 1,
        urgentUnreadCount:
          notification.is_read || !notification.is_urgent
            ? current.urgentUnreadCount
            : current.urgentUnreadCount + 1,
      }));

      if (shouldShowNotificationToast({ notification, drawerOpen: openRef.current })) {
        setToastMessage(formatNotificationToast(notification));
      }

      if (shouldPlayNotificationSound({ notification, soundMuted: soundMutedRef.current })) {
        void playNotificationSound({ muted: soundMutedRef.current });
      }
    },
    [tab],
  );

  useRealtime({ userId, onNotificationInsert: handleInsert });

  const markRead = useCallback(
    async (notificationId: string) => {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      });

      if (!response.ok) {
        return false;
      }

      setState((current) => {
        const target = current.items.find((item) => item.id === notificationId);
        const wasUnread = target && !target.is_read;
        const wasUrgentUnread = wasUnread && target.is_urgent;

        return {
          ...current,
          items: applyReadLocally(current.items, notificationId, tab),
          unreadCount: wasUnread ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
          urgentUnreadCount: wasUrgentUnread
            ? Math.max(0, current.urgentUnreadCount - 1)
            : current.urgentUnreadCount,
        };
      });

      return true;
    },
    [tab],
  );

  const markAllRead = useCallback(async () => {
    const response = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    if (!response.ok) {
      return false;
    }

    setState((current) => ({
      ...current,
      items:
        tab === 'unread'
          ? []
          : current.items.map((item) => ({
              ...item,
              is_read: true,
              read_at: item.read_at ?? new Date().toISOString(),
            })),
      unreadCount: 0,
      urgentUnreadCount: 0,
    }));

    return true;
  }, [tab]);

  const acknowledge = useCallback(
    async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
      });

      if (!response.ok) {
        return false;
      }

      const json = (await response.json()) as { data?: NotificationRecord };
      const updated = json.data;

      setState((current) => {
        const target = current.items.find((item) => item.id === notificationId);
        const wasUnread = target && !target.is_read;
        const wasUrgentUnread = wasUnread && target.is_urgent;

        return {
          ...current,
          items: applyReadLocally(current.items, notificationId, tab, updated),
          unreadCount: wasUnread ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
          urgentUnreadCount: wasUrgentUnread
            ? Math.max(0, current.urgentUnreadCount - 1)
            : current.urgentUnreadCount,
        };
      });

      return true;
    },
    [tab],
  );

  const resolveReschedule = useCallback(
    async (
      endpoint: 'approve' | 'reject',
      rescheduleRequestId: string,
      notificationId: string,
      rejectionReason?: string | null,
    ) => {
      setActionError(null);
      setActionInFlight(notificationId);

      try {
        const response = await fetch(`/api/reschedule-requests/${rescheduleRequestId}/${endpoint}`, {
          method: 'POST',
          headers: endpoint === 'reject' ? { 'Content-Type': 'application/json' } : undefined,
          body:
            endpoint === 'reject'
              ? JSON.stringify({ rejection_reason: rejectionReason ?? null })
              : undefined,
        });

        const json = (await response.json()) as { error?: { message?: string } };

        if (!response.ok) {
          setActionError(json.error?.message ?? 'Failed to resolve reschedule request.');
          return false;
        }

        await markRead(notificationId);
        await loadNotifications(tab);
        return true;
      } catch {
        setActionError('Unable to connect. Check your internet connection.');
        return false;
      } finally {
        setActionInFlight(null);
      }
    },
    [loadNotifications, markRead, tab],
  );

  const approveReschedule = useCallback(
    async (rescheduleRequestId: string, notificationId: string) =>
      resolveReschedule('approve', rescheduleRequestId, notificationId),
    [resolveReschedule],
  );

  const rejectReschedule = useCallback(
    async (rescheduleRequestId: string, notificationId: string, rejectionReason: string | null) =>
      resolveReschedule('reject', rescheduleRequestId, notificationId, rejectionReason),
    [resolveReschedule],
  );

  return {
    open,
    setOpen,
    tab,
    setTab,
    ...state,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    actionError,
    actionInFlight,
    reload: () => loadNotifications(tab),
    markRead,
    markAllRead,
    acknowledge,
    approveReschedule,
    rejectReschedule,
  };
}
