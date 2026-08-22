import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';

export type RescheduleRequestPayload = {
  reschedule_request_id: string;
  proposed_date?: string;
  proposed_start_time?: string;
  proposed_duration_minutes?: number;
};

export function parseRescheduleRequestPayload(payload: unknown): RescheduleRequestPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.reschedule_request_id !== 'string' || record.reschedule_request_id.length === 0) {
    return null;
  }

  return {
    reschedule_request_id: record.reschedule_request_id,
    proposed_date: typeof record.proposed_date === 'string' ? record.proposed_date : undefined,
    proposed_start_time:
      typeof record.proposed_start_time === 'string' ? record.proposed_start_time : undefined,
    proposed_duration_minutes:
      typeof record.proposed_duration_minutes === 'number'
        ? record.proposed_duration_minutes
        : undefined,
  };
}

export function shouldShowRescheduleActions(
  isAdmin: boolean,
  notification: Pick<NotificationRecord, 'type' | 'is_read' | 'payload'>,
): boolean {
  if (!isAdmin || notification.is_read || notification.type !== 'reschedule_request') {
    return false;
  }

  return parseRescheduleRequestPayload(notification.payload) !== null;
}
