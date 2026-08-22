import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';

const TOAST_BODY_MAX = 80;

export function formatNotificationToast(notification: NotificationRecord): string {
  const title = notification.title.trim();
  const body = notification.body.trim();

  if (!body) {
    return title;
  }

  const clipped =
    body.length > TOAST_BODY_MAX ? `${body.slice(0, TOAST_BODY_MAX - 3)}...` : body;

  return `${title} — ${clipped}`;
}

export function shouldShowNotificationToast(options: {
  notification: NotificationRecord;
  drawerOpen: boolean;
}): boolean {
  if (options.notification.is_read) {
    return false;
  }

  if (options.drawerOpen) {
    return false;
  }

  return true;
}

export function shouldPlayNotificationSound(options: {
  notification: NotificationRecord;
  soundMuted: boolean;
}): boolean {
  if (options.soundMuted || options.notification.is_read) {
    return false;
  }

  return true;
}
