import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  countWorkingDaysBetween,
  isWorkingDay,
  workingDaysUntil,
} from '@/lib/utils/working-days';

describe('isWorkingDay', () => {
  it('treats Monday–Friday as working days', () => {
    expect(isWorkingDay('2026-07-06')).toBe(true); // Mon
    expect(isWorkingDay('2026-07-10')).toBe(true); // Fri
  });

  it('excludes weekends', () => {
    expect(isWorkingDay('2026-07-11')).toBe(false); // Sat
    expect(isWorkingDay('2026-07-12')).toBe(false); // Sun
  });
});

describe('countWorkingDaysBetween', () => {
  it('counts only weekdays across a weekend', () => {
    expect(countWorkingDaysBetween('2026-07-10', '2026-07-13')).toBe(1); // Fri → Mon
  });

  it('handles month edges', () => {
    expect(countWorkingDaysBetween('2026-07-30', '2026-08-03')).toBe(2); // Thu → Mon
  });

  it('returns zero when from >= to', () => {
    expect(countWorkingDaysBetween('2026-07-15', '2026-07-15')).toBe(0);
    expect(countWorkingDaysBetween('2026-07-16', '2026-07-15')).toBe(0);
  });
});

describe('workingDaysUntil', () => {
  it('counts inclusive working days from today to a future date', () => {
    expect(workingDaysUntil('2026-07-18', '2026-07-22')).toBe(3); // Sat → Wed (Mon,Tue,Wed)
  });

  it('returns zero when the appointment is in the past', () => {
    expect(workingDaysUntil('2026-07-22', '2026-07-18')).toBe(0);
  });

  it('handles month-end boundaries', () => {
    expect(workingDaysUntil('2026-07-30', '2026-08-03')).toBe(3); // Thu, Fri, Mon
  });
});

describe('addWorkingDays', () => {
  it('skips weekends when advancing forward', () => {
    expect(addWorkingDays('2026-07-10', 1)).toBe('2026-07-13'); // Fri +1 working → Mon
    expect(addWorkingDays('2026-07-10', 3)).toBe('2026-07-15'); // Fri +3 → Wed
  });

  it('skips weekends when going backward', () => {
    expect(addWorkingDays('2026-07-13', -1)).toBe('2026-07-10'); // Mon -1 → Fri
    expect(addWorkingDays('2026-07-22', -3)).toBe('2026-07-17'); // Wed -3 → Fri
  });

  it('returns the same date for zero days', () => {
    expect(addWorkingDays('2026-07-07', 0)).toBe('2026-07-07');
  });
});
