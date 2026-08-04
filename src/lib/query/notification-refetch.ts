/** Backup notification refetch when mutations occur (Realtime is primary — ticket 0027). */

let refetchHandler: (() => void) | null = null;

export function registerNotificationRefetch(handler: () => void): void {
  refetchHandler = handler;
}

export function unregisterNotificationRefetch(): void {
  refetchHandler = null;
}

export function refetchNotificationsBackup(): void {
  refetchHandler?.();
}
