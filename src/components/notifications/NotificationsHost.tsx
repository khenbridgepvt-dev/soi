'use client';

import NotificationCentreDrawer from '@/components/notifications/NotificationCentreDrawer';
import { useNotifications } from '@/lib/hooks/use-notifications';

type NotificationsHostProps = {
  userId?: string;
};

export default function NotificationsHost({ userId }: NotificationsHostProps) {
  const {
    open,
    setOpen,
    tab,
    setTab,
    items,
    loading,
    error,
    unreadCount,
    urgentUnreadCount,
    markRead,
    markAllRead,
    acknowledge,
  } = useNotifications(userId);

  const badgeColour =
    urgentUnreadCount > 0 ? 'bg-error' : unreadCount > 0 ? 'bg-text-muted' : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-md p-2 text-text-secondary hover:bg-page hover:text-text"
      >
        <span aria-hidden="true">🔔</span>
        {badgeColour && unreadCount > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${badgeColour}`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCentreDrawer
        open={open}
        tab={tab}
        items={items}
        loading={loading}
        error={error}
        unreadCount={unreadCount}
        onClose={() => setOpen(false)}
        onTabChange={setTab}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
        onAcknowledge={acknowledge}
      />
    </>
  );
}
