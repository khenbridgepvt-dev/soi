import { describe, expect, it } from 'vitest';
import {
  calculateEndTime,
  describeOutsideHoursWarning,
  findAssignmentConflict,
  formatConflictMessage,
  intervalsOverlap,
  isSlotWithinWorkingHours,
} from '@/lib/utils/availability';

describe('intervalsOverlap', () => {
  it('detects partial overlap', () => {
    expect(
      intervalsOverlap({ start: '11:00', end: '13:00' }, { start: '12:00', end: '14:00' }),
    ).toBe(true);
  });

  it('does not treat adjacent slots as overlapping', () => {
    expect(
      intervalsOverlap({ start: '11:00', end: '13:00' }, { start: '13:00', end: '15:00' }),
    ).toBe(false);
  });

  it('detects containment', () => {
    expect(
      intervalsOverlap({ start: '09:00', end: '17:00' }, { start: '11:00', end: '12:00' }),
    ).toBe(true);
  });
});

describe('calculateEndTime', () => {
  it('adds duration to start time', () => {
    expect(calculateEndTime('11:00', 120)).toEqual({ ok: true, end: '13:00' });
  });

  it('rejects overflow past midnight', () => {
    const result = calculateEndTime('23:30', 60);
    expect(result.ok).toBe(false);
  });

  it('rejects duration below minimum', () => {
    const result = calculateEndTime('09:00', 10);
    expect(result.ok).toBe(false);
  });
});

describe('isSlotWithinWorkingHours', () => {
  const working = { start: '09:00', end: '17:00' };

  it('accepts a slot fully inside working hours', () => {
    expect(isSlotWithinWorkingHours('11:00', '13:00', working)).toBe(true);
  });

  it('rejects a slot that extends past the end', () => {
    expect(isSlotWithinWorkingHours('16:00', '18:00', working)).toBe(false);
  });

  it('rejects when the day is non-working', () => {
    expect(isSlotWithinWorkingHours('11:00', '13:00', null)).toBe(false);
  });
});

describe('describeOutsideHoursWarning', () => {
  it('formats the TC-058 warning', () => {
    expect(describeOutsideHoursWarning('Asha', { start: '09:00', end: '17:00' })).toBe(
      "This slot extends outside Asha's working hours (09:00–17:00).",
    );
  });
});

describe('findAssignmentConflict', () => {
  const existing = [
    {
      assignment_id: 'a1',
      task_id: 't1',
      task_name: 'CCL',
      start: '11:00',
      end: '13:00',
    },
  ];

  it('returns null when there is no overlap', () => {
    expect(findAssignmentConflict({ start: '13:00', end: '15:00' }, existing)).toBeNull();
  });

  it('returns the conflicting assignment', () => {
    const conflict = findAssignmentConflict({ start: '12:00', end: '14:00' }, existing);
    expect(conflict?.task_name).toBe('CCL');
    expect(conflict?.start_time).toBe('11:00');
  });

  it('excludes the current task when reassigning', () => {
    const conflict = findAssignmentConflict(
      { start: '12:00', end: '14:00' },
      existing,
      't1',
    );
    expect(conflict).toBeNull();
  });
});

describe('formatConflictMessage', () => {
  it('formats the TC-056 message', () => {
    expect(
      formatConflictMessage('Asha', {
        assignment_id: 'a1',
        task_id: 't1',
        task_name: 'CCL (Mariya)',
        start_time: '11:00',
        end_time: '13:00',
      }),
    ).toBe("Conflict: Asha already has 'CCL (Mariya)' scheduled from 11:00 to 13:00.");
  });
});
