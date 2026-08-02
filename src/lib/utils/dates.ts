export const TIMETABLE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

export type TimetableDayFields = {
  [K in `${TimetableDay}_start` | `${TimetableDay}_end`]?: string | null;
};

export type TimetableInput = TimetableDayFields;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const DAY_LABELS: Record<TimetableDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/**
 * `YYYY-MM-DD` that is also a real calendar day — `2026-02-30` is rejected.
 * Dates are handled in UTC throughout so a browser timezone can never shift
 * which weekday a schedule is read against.
 */
export function isValidISODate(value: string | null | undefined): boolean {
  if (!value || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** The timetable column a given calendar date reads from. */
export function dayKeyForDate(date: string): TimetableDay {
  // getUTCDay() is 0 = Sunday; TIMETABLE_DAYS starts at Monday.
  return TIMETABLE_DAYS[(utcDate(date).getUTCDay() + 6) % 7];
}

/** Shifts an ISO date by whole days, e.g. the grid's prev/next chevrons. */
export function addDays(date: string, days: number): string {
  const shifted = utcDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Today in the viewer's local calendar, as `YYYY-MM-DD`. */
export function todayISODate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `Mon 7 Jul 2026` — the date-nav label of design_system §3.2. */
export function formatLongDate(date: string): string {
  const parsed = utcDate(date);
  const weekday = WEEKDAY_LABELS[(parsed.getUTCDay() + 6) % 7];
  const month = MONTH_LABELS[parsed.getUTCMonth()];

  return `${weekday} ${parsed.getUTCDate()} ${month} ${parsed.getUTCFullYear()}`;
}

/** `2m`, `15m`, `1h`, `Yesterday`, `3 Jul` — S-14 relative timestamps. */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const created = new Date(isoTimestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return 'now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const today = todayISODate(now);
  const createdDay = todayISODate(created);
  const yesterday = addDays(today, -1);

  if (createdDay === yesterday) {
    return 'Yesterday';
  }

  const parsed = utcDate(createdDay);
  const month = MONTH_LABELS[parsed.getUTCMonth()];
  return `${parsed.getUTCDate()} ${month}`;
}

export function generateTimeSlotOptions(): string[] {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function isTimeAlignedTo30Minutes(time: string): boolean {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    return false;
  }

  const minutes = Number(match[2]);
  return minutes === 0 || minutes === 30;
}

export function shortTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function minutesBetween(start: string, end: string): number {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export function calculateWeeklyHours(timetable: TimetableInput): number {
  let totalMinutes = 0;

  for (const day of TIMETABLE_DAYS) {
    const start = shortTime(timetable[`${day}_start`]);
    const end = shortTime(timetable[`${day}_end`]);

    if (start && end) {
      totalMinutes += minutesBetween(start, end);
    }
  }

  return totalMinutes / 60;
}

export function validateTimePair(
  start: string | null | undefined,
  end: string | null | undefined,
  day: TimetableDay,
): { ok: true; start: string | null; end: string | null } | {
  ok: false;
  message: string;
  field: string;
} {
  const dayLabel = DAY_LABELS[day];
  const startValue = start === undefined || start === '' ? null : start;
  const endValue = end === undefined || end === '' ? null : end;

  if (startValue === null && endValue === null) {
    return { ok: true, start: null, end: null };
  }

  if (startValue === null || endValue === null) {
    return {
      ok: false,
      message: `${dayLabel}: start and end must both be set or both be empty.`,
      field: `${day}_start`,
    };
  }

  if (!TIME_PATTERN.test(startValue) || !TIME_PATTERN.test(endValue)) {
    return {
      ok: false,
      message: `${dayLabel}: times must be in HH:MM format.`,
      field: `${day}_start`,
    };
  }

  if (!isTimeAlignedTo30Minutes(startValue) || !isTimeAlignedTo30Minutes(endValue)) {
    return {
      ok: false,
      message: `${dayLabel}: times must align to 30-minute slots.`,
      field: `${day}_start`,
    };
  }

  if (startValue >= endValue) {
    return {
      ok: false,
      message: 'End time must be after start time.',
      field: `${day}_end`,
    };
  }

  return { ok: true, start: startValue, end: endValue };
}

export function validateTimetable(
  input: TimetableInput,
): { ok: true; value: Record<`${TimetableDay}_start` | `${TimetableDay}_end`, string | null> } | {
  ok: false;
  message: string;
  details: Array<{ field: string; message: string }>;
} {
  const value = {} as Record<`${TimetableDay}_start` | `${TimetableDay}_end`, string | null>;
  const details: Array<{ field: string; message: string }> = [];

  for (const day of TIMETABLE_DAYS) {
    const result = validateTimePair(input[`${day}_start`], input[`${day}_end`], day);

    if (!result.ok) {
      details.push({ field: result.field, message: result.message });
      continue;
    }

    value[`${day}_start`] = result.start;
    value[`${day}_end`] = result.end;
  }

  if (details.length > 0) {
    return {
      ok: false,
      message: details[0].message,
      details,
    };
  }

  return { ok: true, value };
}
