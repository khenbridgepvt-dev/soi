import { describe, expect, it } from 'vitest';

import {
  formatNotificationToast,
  shouldPlayNotificationSound,
  shouldShowNotificationToast,
} from '@/lib/notifications/notification-toast';
import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';

const notification: NotificationRecord = {
  id: 'n1',
  type: 'task_blocked',
  title: 'Task blocked',
  body: 'A task was blocked and needs attention.',
  is_urgent: true,
  is_read: false,
  read_at: null,
  acknowledged_at: null,
  case_id: null,
  task_id: null,
  payload: null,
  created_at: '2026-08-17T12:00:00.000Z',
};

describe('formatNotificationToast', () => {
  it('combines title and body with truncation', () => {
    expect(formatNotificationToast(notification)).toBe(
      'Task blocked — A task was blocked and needs attention.',
    );

    const longBody = {
      ...notification,
      body: 'x'.repeat(120),
    };

    expect(formatNotificationToast(longBody).length).toBeLessThan(120);
    expect(formatNotificationToast(longBody)).toContain('...');
  });
});

describe('shouldShowNotificationToast', () => {
  it('shows toast for unread notifications when drawer is closed', () => {
    expect(
      shouldShowNotificationToast({ notification, drawerOpen: false }),
    ).toBe(true);
    expect(
      shouldShowNotificationToast({ notification, drawerOpen: true }),
    ).toBe(false);
    expect(
      shouldShowNotificationToast({
        notification: { ...notification, is_read: true },
        drawerOpen: false,
      }),
    ).toBe(false);
  });
});

describe('shouldPlayNotificationSound', () => {
  it('plays for unread notifications unless muted', () => {
    expect(
      shouldPlayNotificationSound({ notification, soundMuted: false }),
    ).toBe(true);
    expect(
      shouldPlayNotificationSound({ notification, soundMuted: true }),
    ).toBe(false);
  });
});
