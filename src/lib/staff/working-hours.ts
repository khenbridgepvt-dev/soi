type TimetableRow = {
  mon_start: string | null;
  mon_end: string | null;
  fri_start: string | null;
  fri_end: string | null;
};

function shortTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.length >= 5 ? value.slice(0, 5) : value;
}

/** Display Mon–Fri hours when uniform; otherwise a generic label. */
export function formatWorkingHours(timetable: TimetableRow | null | undefined): string {
  const monStart = shortTime(timetable?.mon_start);
  const monEnd = shortTime(timetable?.mon_end);

  if (!monStart || !monEnd) {
    return '—';
  }

  const friStart = shortTime(timetable?.fri_start);
  const friEnd = shortTime(timetable?.fri_end);

  const monFriUniform = monStart === friStart && monEnd === friEnd;

  if (monFriUniform) {
    return `${monStart}–${monEnd}`;
  }

  return `${monStart}–${monEnd}`;
}
