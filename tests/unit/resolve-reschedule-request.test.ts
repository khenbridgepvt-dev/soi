import { describe, expect, it } from 'vitest';
import { buildRescheduleResponseNotificationRows } from '@/lib/notifications/fanout';
import { shouldShowRescheduleActions } from '@/lib/notifications/reschedule-notification-ui';
import { parseRejectRescheduleInput } from '@/lib/tasks/parse-reject-reschedule';

describe('parseRejectRescheduleInput', () => {
  it('accepts an empty body as no reason', () => {
    expect(parseRejectRescheduleInput(null)).toEqual({ ok: true, rejection_reason: null });
  });

  it('trims and accepts a rejection reason', () => {
    const result = parseRejectRescheduleInput({ rejection_reason: ' Slot taken ' });
    expect(result).toEqual({ ok: true, rejection_reason: 'Slot taken' });
  });

  it('rejects reasons longer than 500 characters', () => {
    const result = parseRejectRescheduleInput({ rejection_reason: 'x'.repeat(501) });
    expect(result.ok).toBe(false);
  });
});

describe('buildRescheduleResponseNotificationRows', () => {
  it('builds an approved response row', () => {
    const rows = buildRescheduleResponseNotificationRows({
      userId: 'staff-a',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      outcome: 'approved',
      proposedDate: '2026-08-20',
      proposedStartTime: '10:00',
      proposedEndTime: '11:00',
    });

    expect(rows[0]).toMatchObject({
      user_id: 'staff-a',
      type: 'reschedule_response',
      title: 'Reschedule approved',
    });
    expect(rows[0].body).toContain('moved to');
  });

  it('builds a rejected response row with reason', () => {
    const rows = buildRescheduleResponseNotificationRows({
      userId: 'staff-a',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      outcome: 'rejected',
      proposedDate: '2026-08-20',
      proposedStartTime: '10:00',
      proposedEndTime: '11:00',
      rejectionReason: 'Client unavailable',
    });

    expect(rows[0].title).toBe('Reschedule rejected');
    expect(rows[0].body).toContain('Client unavailable');
  });
});

describe('shouldShowRescheduleActions', () => {
  const notification = {
    type: 'reschedule_request' as const,
    is_read: false,
    payload: {
      reschedule_request_id: 'req-1',
      proposed_date: '2026-08-20',
      proposed_start_time: '10:00',
      proposed_duration_minutes: 60,
    },
  };

  it('shows actions for unread admin reschedule requests', () => {
    expect(shouldShowRescheduleActions(true, notification)).toBe(true);
  });

  it('hides actions for staff users', () => {
    expect(shouldShowRescheduleActions(false, notification)).toBe(false);
  });

  it('hides actions when the notification is read', () => {
    expect(shouldShowRescheduleActions(true, { ...notification, is_read: true })).toBe(false);
  });

  it('hides actions when payload is missing the request id', () => {
    expect(
      shouldShowRescheduleActions(true, {
        ...notification,
        payload: { proposed_date: '2026-08-20' },
      }),
    ).toBe(false);
  });
});
