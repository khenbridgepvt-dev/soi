import { describe, expect, it } from 'vitest';
import {
  isScheduleAssignmentDeleted,
  scheduleAssignmentStatusDotClass,
  scheduleAssignmentStatusLabel,
  scheduleAssignmentStatusSuffix,
} from '@/lib/schedule/assignment-status';

describe('scheduleAssignmentStatusLabel', () => {
  it('prioritises deleted over blocked and urgent', () => {
    expect(
      scheduleAssignmentStatusLabel({
        task_status: 'blocked',
        is_urgent: true,
        case_deleted: true,
      }),
    ).toBe('DELETED');
  });

  it('shows deleted when case or task is soft-deleted', () => {
    expect(
      scheduleAssignmentStatusLabel({ task_status: 'in_progress', case_deleted: true }),
    ).toBe('DELETED');
    expect(
      scheduleAssignmentStatusLabel({ task_status: 'in_progress', task_deleted: true }),
    ).toBe('DELETED');
  });

  it('prioritises blocked over urgent', () => {
    expect(
      scheduleAssignmentStatusLabel({ task_status: 'blocked', is_urgent: true }),
    ).toBe('BLOCKED');
  });

  it('shows completed for completed tasks (ADR-0008 — not urgent)', () => {
    expect(
      scheduleAssignmentStatusLabel({ task_status: 'completed', is_urgent: true }),
    ).toBe('COMPLETED');
  });

  it('shows urgent for active urgent tasks', () => {
    expect(
      scheduleAssignmentStatusLabel({ task_status: 'in_progress', is_urgent: true }),
    ).toBe('URGENT');
  });

  it('returns null for standard active tasks', () => {
    expect(
      scheduleAssignmentStatusLabel({ task_status: 'not_started', is_urgent: false }),
    ).toBeNull();
  });
});

describe('isScheduleAssignmentDeleted', () => {
  it('is true when case_deleted or task_deleted', () => {
    expect(
      isScheduleAssignmentDeleted({ task_status: 'not_started', case_deleted: true }),
    ).toBe(true);
    expect(
      isScheduleAssignmentDeleted({ task_status: 'not_started', task_deleted: true }),
    ).toBe(true);
    expect(
      isScheduleAssignmentDeleted({ task_status: 'not_started' }),
    ).toBe(false);
  });
});

describe('scheduleAssignmentStatusDotClass', () => {
  it('maps blocked, completed, urgent, and on-track', () => {
    expect(
      scheduleAssignmentStatusDotClass({ task_status: 'blocked' }),
    ).toBe('bg-status-blocked-border');
    expect(
      scheduleAssignmentStatusDotClass({ task_status: 'completed' }),
    ).toBe('bg-status-onTrack-border');
    expect(
      scheduleAssignmentStatusDotClass({ task_status: 'in_progress', is_urgent: true }),
    ).toBe('bg-error');
    expect(
      scheduleAssignmentStatusDotClass({ task_status: 'not_started' }),
    ).toBe('bg-status-onTrack-border');
  });
});

describe('scheduleAssignmentStatusSuffix', () => {
  it('formats label suffix for detail lines', () => {
    expect(
      scheduleAssignmentStatusSuffix({ task_status: 'blocked' }),
    ).toBe(' · BLOCKED');
    expect(
      scheduleAssignmentStatusSuffix({ task_status: 'not_started' }),
    ).toBe('');
  });
});
