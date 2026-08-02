import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKeyForDate,
  formatLongDate,
  formatRelativeTime,
  isValidISODate,
  todayISODate,
} from '@/lib/utils/dates';

describe('isValidISODate', () => {
  it.each(['2026-07-07', '2026-02-28', '2024-02-29'])('accepts %s', (date) => {
    expect(isValidISODate(date)).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['a null', null],
    ['a slash-separated date', '2026/07/07'],
    ['a short year', '26-07-07'],
    ['a day that does not exist', '2026-02-30'],
    ['a month that does not exist', '2026-13-01'],
    ['a timestamp', '2026-07-07T09:00:00Z'],
  ])('rejects %s', (_label, date) => {
    expect(isValidISODate(date)).toBe(false);
  });
});

describe('dayKeyForDate', () => {
  it.each([
    ['2026-07-06', 'mon'],
    ['2026-07-07', 'tue'],
    ['2026-07-08', 'wed'],
    ['2026-07-09', 'thu'],
    ['2026-07-10', 'fri'],
    ['2026-07-11', 'sat'],
    ['2026-07-12', 'sun'],
  ])('maps %s to %s', (date, key) => {
    expect(dayKeyForDate(date)).toBe(key);
  });
});

describe('addDays', () => {
  it('steps forward a day', () => {
    expect(addDays('2026-07-07', 1)).toBe('2026-07-08');
  });

  it('steps back a day', () => {
    expect(addDays('2026-07-07', -1)).toBe('2026-07-06');
  });

  it('crosses a month boundary', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('crosses a year boundary backwards', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('todayISODate', () => {
  it('formats a local date without shifting it across a timezone', () => {
    expect(todayISODate(new Date(2026, 6, 7, 23, 30))).toBe('2026-07-07');
  });

  it('pads single-digit months and days', () => {
    expect(todayISODate(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });
});

describe('formatLongDate', () => {
  it('renders the design_system §3.2 date-nav label', () => {
    expect(formatLongDate('2026-07-07')).toBe('Tue 7 Jul 2026');
  });

  it('does not zero-pad the day of month', () => {
    expect(formatLongDate('2026-12-01')).toBe('Tue 1 Dec 2026');
  });
});

describe('formatRelativeTime', () => {
  it('formats S-14 relative timestamps', () => {
    const now = new Date('2026-07-07T15:00:00');
    expect(formatRelativeTime('2026-07-07T14:45:00', now)).toBe('15m');
    expect(formatRelativeTime('2026-07-07T13:00:00', now)).toBe('2h');
    expect(formatRelativeTime('2026-07-06T10:00:00', now)).toBe('Yesterday');
  });
});
