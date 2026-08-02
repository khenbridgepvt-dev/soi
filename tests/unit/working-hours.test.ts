import { describe, expect, it } from 'vitest';
import { formatWorkingHours } from '@/lib/staff/working-hours';

describe('formatWorkingHours', () => {
  it('formats uniform Mon–Fri hours', () => {
    expect(
      formatWorkingHours({
        mon_start: '09:00',
        mon_end: '17:00',
        fri_start: '09:00',
        fri_end: '17:00',
      }),
    ).toBe('09:00–17:00');
  });

  it('returns dash when timetable is missing', () => {
    expect(formatWorkingHours(null)).toBe('—');
  });
});
