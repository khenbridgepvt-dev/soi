import { shortTime } from '@/lib/utils/dates';

/** `appt 19 (3:30)` — wireframe S-03 appointment line. */
export function formatBoardAppointment(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const day = date.getDate();
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });

  return `appt ${day} (${time})`;
}

/** `last date 28 Jul` — wireframe S-03 last-date line. */
export function formatBoardLastDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });

  return `last date ${day} ${month}`;
}

export function formatBoardClientName(
  firstName: string,
  lastName: string,
  dependantCount: number,
): string {
  const base = `${firstName} ${lastName}`.trim();

  if (dependantCount > 0) {
    return `${base} +${dependantCount}`;
  }

  return base;
}

export function formatBoardAssignmentTime(
  start: string | null,
  end: string | null,
): string | null {
  const startLabel = shortTime(start);
  const endLabel = shortTime(end);

  if (!startLabel || !endLabel) {
    return null;
  }

  return `(${startLabel}–${endLabel})`;
}
