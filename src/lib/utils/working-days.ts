import { addDays, isValidISODate } from './dates.ts';

const UTC_DAY = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** True when `date` falls on Monday–Friday (UTC calendar). */
export function isWorkingDay(date: string): boolean {
  if (!isValidISODate(date)) {
    return false;
  }

  const day = UTC_DAY(date);
  return day !== 0 && day !== 6;
}

/** Monday–Friday working days between two ISO dates (exclusive of `from`, inclusive of `to`). */
export function countWorkingDaysBetween(from: string, to: string): number {
  if (!isValidISODate(from) || !isValidISODate(to)) {
    return 0;
  }

  if (from >= to) {
    return 0;
  }

  let count = 0;
  let cursor = addDays(from, 1);

  while (cursor <= to) {
    if (isWorkingDay(cursor)) {
      count += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return count;
}

/** Whole working days from `from` (typically today) up to and including `to`. */
export function workingDaysUntil(from: string, to: string): number {
  if (!isValidISODate(from) || !isValidISODate(to)) {
    return Number.POSITIVE_INFINITY;
  }

  if (to < from) {
    return 0;
  }

  let count = 0;
  let cursor = from;

  while (cursor <= to) {
    if (isWorkingDay(cursor)) {
      count += 1;
    }
    if (cursor === to) {
      break;
    }
    cursor = addDays(cursor, 1);
  }

  return count;
}

/** Advance `from` by `days` working days (Mon–Fri). Negative values go backward. */
export function addWorkingDays(from: string, days: number): string {
  if (!isValidISODate(from) || days === 0) {
    return from;
  }

  let remaining = Math.abs(days);
  let cursor = from;
  const step = days > 0 ? 1 : -1;

  while (remaining > 0) {
    cursor = addDays(cursor, step);
    if (isWorkingDay(cursor)) {
      remaining -= 1;
    }
  }

  return cursor;
}
