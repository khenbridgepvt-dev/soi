'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';
import {
  parseRescheduleRequestPayload,
  shouldShowRescheduleActions,
} from '@/lib/notifications/reschedule-notification-ui';
import { formatRelativeTime } from '@/lib/utils/dates';

type NotificationCentreDrawerProps = {
  open: boolean;
  tab: 'all' | 'unread';
  items: NotificationRecord[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onTabChange: (tab: 'all' | 'unread') => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onApproveReschedule: (rescheduleRequestId: string, notificationId: string) => Promise<boolean>;
  onRejectReschedule: (
    rescheduleRequestId: string,
    notificationId: string,
    rejectionReason: string | null,
  ) => Promise<boolean>;
  unreadCount: number;
  actionError: string | null;
  actionInFlight: string | null;
};

function notificationIcon(notification: NotificationRecord): string {
  if (notification.is_urgent) {
    return '🔴';
  }

  if (
    notification.type === 'task_blocked' ||
    notification.type === 'task_overdue' ||
    notification.type === 'reschedule_request'
  ) {
    return '🟡';
  }

  return '🔵';
}

function itemClassName(notification: NotificationRecord): string {
  if (!notification.is_read && notification.is_urgent) {
    return 'border-l-[3px] border-error bg-error-bg';
  }

  if (!notification.is_read) {
    return 'border-l-[3px] border-primary bg-[#F4F8FC]';
  }

  return 'border-l-[3px] border-transparent bg-surface';
}

function caseHref(pathname: string, caseId: string, taskId: string | null): string {
  const base = pathname.startsWith('/staff') ? '/staff/cases' : '/cases';
  const query = taskId ? `?task=${taskId}` : '';
  return `${base}/${caseId}${query}`;
}

function RescheduleActions({
  notification,
  actionInFlight,
  onApproveReschedule,
  onRejectReschedule,
}: {
  notification: NotificationRecord;
  actionInFlight: string | null;
  onApproveReschedule: NotificationCentreDrawerProps['onApproveReschedule'];
  onRejectReschedule: NotificationCentreDrawerProps['onRejectReschedule'];
}) {
  const payload = parseRescheduleRequestPayload(notification.payload);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const busy = actionInFlight === notification.id;

  if (!payload) {
    return null;
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {!showReject ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onApproveReschedule(payload.reschedule_request_id, notification.id)}
            className="rounded-md border border-status-onTrack-border bg-status-onTrack-bg px-2 py-1 text-xs font-medium text-status-onTrack-border hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject(true)}
            className="rounded-md border border-error bg-error-bg px-2 py-1 text-xs font-medium text-error hover:bg-error-bg/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-text-secondary">
            Rejection reason (optional)
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-text"
              placeholder="Explain why this slot cannot be used"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onRejectReschedule(
                  payload.reschedule_request_id,
                  notification.id,
                  rejectReason.trim() || null,
                )
              }
              className="rounded-md border border-error bg-error-bg px-2 py-1 text-xs font-medium text-error hover:bg-error-bg/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowReject(false);
                setRejectReason('');
              }}
              className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-page"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificationCentreDrawer({
  open,
  tab,
  items,
  loading,
  error,
  onClose,
  onTabChange,
  onMarkAllRead,
  onMarkRead,
  onAcknowledge,
  onApproveReschedule,
  onRejectReschedule,
  unreadCount,
  actionError,
  actionInFlight,
}: NotificationCentreDrawerProps) {
  const pathname = usePathname();
  const isAdmin = !pathname.startsWith('/staff');

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20"
        aria-label="Close notifications"
        onClick={onClose}
      />

      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-lg"
        aria-label="Notification centre"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-text">Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-text-secondary hover:bg-page"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => onTabChange('all')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === 'all' ? 'bg-page font-medium text-text' : 'text-text-secondary'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onTabChange('unread')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === 'unread' ? 'bg-page font-medium text-text' : 'text-text-secondary'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {actionError && (
          <p className="border-b border-border bg-error-bg px-4 py-2 text-sm text-error">{actionError}</p>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">Loading…</p>
          )}

          {error && (
            <p className="px-4 py-8 text-center text-sm text-error">{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">
              You&apos;re all caught up. No new notifications.
            </p>
          )}

          {!loading &&
            !error &&
            items.map((notification) => (
              <div
                key={notification.id}
                className={`min-h-[56px] border-b border-border px-4 py-3 ${itemClassName(notification)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        notification.is_read ? 'font-medium text-text' : 'font-semibold text-text'
                      }`}
                    >
                      <span aria-hidden="true" className="mr-1">
                        {notificationIcon(notification)}
                      </span>
                      {notification.is_urgent && !notification.is_read ? 'URGENT · ' : ''}
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">{notification.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>

                {shouldShowRescheduleActions(isAdmin, notification) && (
                  <RescheduleActions
                    notification={notification}
                    actionInFlight={actionInFlight}
                    onApproveReschedule={onApproveReschedule}
                    onRejectReschedule={onRejectReschedule}
                  />
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {notification.case_id && (
                    <Link
                      href={caseHref(pathname, notification.case_id, notification.task_id)}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-primary hover:bg-page"
                      onClick={() => {
                        if (!notification.is_read) {
                          void onMarkRead(notification.id);
                        }
                      }}
                    >
                      {notification.task_id ? 'View Task' : 'View Case'}
                    </Link>
                  )}

                  {notification.is_urgent && !notification.acknowledged_at && (
                    <button
                      type="button"
                      onClick={() => void onAcknowledge(notification.id)}
                      className="rounded-md border border-error bg-error-bg px-2 py-1 text-xs font-medium text-error hover:bg-error-bg/80"
                    >
                      Acknowledge
                    </button>
                  )}

                  {!notification.is_read && !notification.is_urgent && (
                    <button
                      type="button"
                      onClick={() => void onMarkRead(notification.id)}
                      className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-page"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={() => void onMarkAllRead()}
            disabled={unreadCount === 0}
            className="w-full rounded-md border border-border bg-page px-3 py-2 text-sm font-medium text-text hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark All as Read
          </button>
        </div>
      </aside>
    </>
  );
}
