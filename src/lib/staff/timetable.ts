import {
  shortTime,
  TIMETABLE_DAYS,
  type TimetableDay,
  type TimetableInput,
} from '@/lib/utils/dates';
import type { Database } from '@/types/database';

export type StaffTimetableRow = Database['public']['Tables']['staff_timetables']['Row'];

export type StaffTimetableResponse = {
  id: string;
  staff_id: string;
  updated_at: string;
} & Record<`${TimetableDay}_start` | `${TimetableDay}_end`, string | null>;

export function serializeTimetableRow(row: StaffTimetableRow): StaffTimetableResponse {
  const days = {} as Record<`${TimetableDay}_start` | `${TimetableDay}_end`, string | null>;

  for (const day of TIMETABLE_DAYS) {
    days[`${day}_start`] = shortTime(row[`${day}_start`]);
    days[`${day}_end`] = shortTime(row[`${day}_end`]);
  }

  return {
    id: row.id,
    staff_id: row.staff_id,
    updated_at: row.updated_at,
    ...days,
  };
}

export function toTimetableUpdate(
  value: Record<`${TimetableDay}_start` | `${TimetableDay}_end`, string | null>,
): Database['public']['Tables']['staff_timetables']['Update'] {
  return value;
}

export function parseTimetableBody(body: TimetableInput): TimetableInput {
  const parsed: TimetableInput = {};

  for (const day of TIMETABLE_DAYS) {
    parsed[`${day}_start`] = body[`${day}_start`] ?? null;
    parsed[`${day}_end`] = body[`${day}_end`] ?? null;
  }

  return parsed;
}
