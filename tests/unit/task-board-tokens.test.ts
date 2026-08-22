import { describe, expect, it } from 'vitest';
import { resolveTaskBoardToken } from '@/lib/task-board/card-token';

const base = {
  status: 'not_started' as const,
  isOverdue: false,
  isCaseUrgent: false,
  sequence: 5,
  lastDate: null,
  appointmentDate: null,
  assignmentDate: null,
  assignmentStartTime: null,
  assignmentEndTime: null,
  now: new Date('2026-07-15T12:00:00Z'),
};

describe('resolveTaskBoardToken', () => {
  it('returns blocked for blocked tasks', () => {
    expect(resolveTaskBoardToken({ ...base, status: 'blocked' })).toBe('blocked');
  });

  it('returns overdue when is_overdue is set', () => {
    expect(resolveTaskBoardToken({ ...base, status: 'in_progress', isOverdue: true })).toBe(
      'overdue',
    );
  });

  it('returns overdue when reminder_date is due (ADR-0022)', () => {
    expect(
      resolveTaskBoardToken({
        ...base,
        status: 'in_progress',
        reminderDate: '2026-07-10',
        now: new Date('2026-07-15T12:00:00Z'),
      }),
    ).toBe('overdue');
  });

  it('returns approaching when deadline is in remind_days_before window', () => {
    expect(
      resolveTaskBoardToken({
        ...base,
        status: 'not_started',
        deadlineDate: '2026-07-20',
        remindDaysBefore: 3,
        now: new Date('2026-07-17T12:00:00Z'),
      }),
    ).toBe('approaching');
  });

  it('returns urgent for urgent active tasks (ADR-0008)', () => {
    expect(
      resolveTaskBoardToken({
        ...base,
        status: 'in_progress',
        isCaseUrgent: true,
      }),
    ).toBe('urgent');
  });

  it('does not apply urgent styling to completed tasks (ADR-0008)', () => {
    expect(
      resolveTaskBoardToken({
        ...base,
        status: 'completed',
        isCaseUrgent: true,
      }),
    ).toBe('completed');
  });

  it('returns approaching when last_date is within 3 calendar days', () => {
    expect(
      resolveTaskBoardToken({
        ...base,
        status: 'in_progress',
        lastDate: '2026-07-17',
        now: new Date('2026-07-15T12:00:00Z'),
      }),
    ).toBe('approaching');
  });

  it('returns approaching when 50% of today assignment has elapsed', () => {
    expect(
      resolveTaskBoardToken({
        ...base,
        status: 'in_progress',
        assignmentDate: '2026-07-15',
        assignmentStartTime: '10:00',
        assignmentEndTime: '12:00',
        now: new Date('2026-07-15T11:00:00Z'),
      }),
    ).toBe('approaching');
  });

  it('escalates DU tasks by working days before appointment (ADR-0007)', () => {
    const appointment = '2026-07-22'; // Tue

    expect(
      resolveTaskBoardToken({
        ...base,
        sequence: 13,
        status: 'in_progress',
        appointmentDate: appointment,
        now: new Date('2026-07-18T12:00:00Z'),
      }),
    ).toBe('approaching');

    expect(
      resolveTaskBoardToken({
        ...base,
        sequence: 12,
        status: 'in_progress',
        appointmentDate: appointment,
        now: new Date('2026-07-21T12:00:00Z'),
      }),
    ).toBe('urgent');

    expect(
      resolveTaskBoardToken({
        ...base,
        sequence: 13,
        status: 'in_progress',
        appointmentDate: appointment,
        now: new Date('2026-07-22T12:00:00Z'),
      }),
    ).toBe('overdue');
  });

  it('returns approaching for in_progress tasks without escalation (ADR-0022)', () => {
    expect(resolveTaskBoardToken({ ...base, status: 'in_progress' })).toBe('approaching');
  });

  it('returns standard for not_started tasks without escalation', () => {
    expect(resolveTaskBoardToken({ ...base, status: 'not_started' })).toBe('standard');
  });
});
