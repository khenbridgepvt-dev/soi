import { describe, expect, it } from 'vitest';
import {
  buildRescheduleRequestNotificationRows,
} from '@/lib/notifications/fanout';
import {
  parseRescheduleRequestInput,
  RESCHEDULE_NOTE_MAX,
} from '@/lib/tasks/parse-reschedule-request';

describe('parseRescheduleRequestInput', () => {
  it('accepts a valid reschedule request body', () => {
    const result = parseRescheduleRequestInput({
      assignment_id: 'a1111111-1111-4111-8111-111111111111',
      date: '2026-08-20',
      start_time: '10:00',
      duration_minutes: 60,
      note: 'Client prefers morning',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        assignment_id: 'a1111111-1111-4111-8111-111111111111',
        date: '2026-08-20',
        start_time: '10:00',
        duration_minutes: 60,
        note: 'Client prefers morning',
      });
    }
  });

  it('normalises blank note to null', () => {
    const result = parseRescheduleRequestInput({
      assignment_id: 'a1111111-1111-4111-8111-111111111111',
      date: '2026-08-20',
      start_time: '10:00',
      duration_minutes: 60,
      note: '   ',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.note).toBeNull();
    }
  });

  it('rejects missing assignment_id', () => {
    const result = parseRescheduleRequestInput({
      date: '2026-08-20',
      start_time: '10:00',
      duration_minutes: 60,
    });

    expect(result.ok).toBe(false);
  });

  it('rejects note longer than the max length', () => {
    const result = parseRescheduleRequestInput({
      assignment_id: 'a1111111-1111-4111-8111-111111111111',
      date: '2026-08-20',
      start_time: '10:00',
      duration_minutes: 60,
      note: 'x'.repeat(RESCHEDULE_NOTE_MAX + 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(RESCHEDULE_NOTE_MAX));
    }
  });
});

describe('buildRescheduleRequestNotificationRows', () => {
  it('builds one reschedule_request row per admin with payload', () => {
    const rows = buildRescheduleRequestNotificationRows({
      adminIds: ['admin-a', 'admin-b'],
      rescheduleRequestId: 'req-1',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      staffName: 'Asha Patel',
      proposedDate: '2026-08-20',
      proposedStartTime: '10:00',
      proposedEndTime: '11:00',
      proposedDurationMinutes: 60,
      reason: 'Client unavailable',
      isOvertime: true,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: 'admin-a',
      type: 'reschedule_request',
      case_id: 'case-1',
      task_id: 'task-1',
    });
    expect(rows[0].body).toContain('Asha Patel');
    expect(rows[0].body).toContain('072601/SKW/VIS');
    expect(rows[0].body).toContain('outside working hours');
    expect(rows[0].payload).toEqual({
      reschedule_request_id: 'req-1',
      proposed_date: '2026-08-20',
      proposed_start_time: '10:00',
      proposed_duration_minutes: 60,
    });
  });
});
