import { describe, expect, it } from 'vitest';

import {
  buildAssignOvertimeWarnings,
  validateAssignStartTimeAlignment,
} from '@/lib/tasks/assign-validation';
import { calculateEndTime } from '@/lib/utils/availability';
import { isTimeAlignedTo30Minutes } from '@/lib/utils/dates';

describe('flexible firm assign (0111)', () => {
  it('allows minute-precision start times for internal cases', () => {
    expect(validateAssignStartTimeAlignment('10:15', true)).toBeNull();
    expect(isTimeAlignedTo30Minutes('10:15')).toBe(false);
  });

  it('rejects non-aligned start times for client cases', () => {
    expect(validateAssignStartTimeAlignment('10:15', false)).toBe(
      'start_time must align to 30-minute slots.',
    );
    expect(validateAssignStartTimeAlignment('10:00', false)).toBeNull();
  });

  it('computes end time for 10:15 + 90 minutes', () => {
    expect(calculateEndTime('10:15', 90)).toEqual({ ok: true, end: '11:45' });
  });

  it('returns overtime warning text without blocking', () => {
    expect(
      buildAssignOvertimeWarnings(true, 'Asha', { start: '09:00', end: '17:00' }),
    ).toEqual([
      "This slot extends outside Asha's working hours (09:00–17:00).",
    ]);
    expect(
      buildAssignOvertimeWarnings(false, 'Asha', { start: '09:00', end: '17:00' }),
    ).toBeUndefined();
  });
});
