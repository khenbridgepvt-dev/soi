const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function ukOrdinalSuffix(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** UK ordinal date, e.g. `27th February 2026`. */
export function formatUkOrdinalDate(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day}${ukOrdinalSuffix(day)} ${month} ${year}`;
}

/** Parse ISO date string (`YYYY-MM-DD`) or return today when absent. */
export function resolvePresentDate(input?: string): Date {
  if (!input?.trim()) {
    return new Date();
  }

  const parsed = new Date(`${input.trim()}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

export function formatPresentDate(input?: string): string {
  return formatUkOrdinalDate(resolvePresentDate(input));
}

/** Display DOB as DD/MM/YYYY for parental consent. */
export function formatDobDisplay(input: string): string {
  const trimmed = input.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}
