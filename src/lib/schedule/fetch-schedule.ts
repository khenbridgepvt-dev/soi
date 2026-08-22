import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  buildSlotTimeline,
  computeAvailableSlots,
  computeGridRange,
  computeSlotStates,
  mergeIntervals,
  SLOT_MINUTES,
  toMinutes,
  type ComputedSlot,
  type TimeInterval,
} from '@/lib/utils/availability';
import { dayKeyForDate, shortTime } from '@/lib/utils/dates';

/**
 * EP-24 / EP-25 schedule grid (ticket 0021).
 *
 * Every derived value — availability, per-row slot states, the grid's vertical
 * extent — is produced here, server-side. The client renders what it is given
 * and computes nothing (IMPLEMENTATION_PLAN §E, R3 mitigation).
 */

export type ScheduleAssignment = {
  id: string;
  task_id: string;
  task_name: string;
  task_abbreviation: string;
  task_status: Database['public']['Enums']['task_status'];
  case_id: string | null;
  case_reference: string | null;
  client_name: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_urgent: boolean;
  is_overdue: boolean;
  reminder_date: string | null;
  deadline_date: string | null;
  remind_days_before: number | null;
  case_deleted: boolean;
  task_deleted: boolean;
  case_is_internal: boolean;
};

export type ScheduleStaff = {
  id: string;
  full_name: string;
  online_status: Database['public']['Enums']['online_status'];
  working_hours: TimeInterval | null;
  /** Always false in MVP — leave management is Phase 2 (ADR-0001). */
  is_on_leave: boolean;
  assignments: ScheduleAssignment[];
  available_slots: TimeInterval[];
  slots: ComputedSlot[];
  working_minutes: number;
  booked_minutes: number;
};

export type ScheduleGrid = {
  slot_minutes: number;
  start_time: string | null;
  end_time: string | null;
  times: TimeInterval[];
};

export type SchedulePayload = {
  date: string;
  grid: ScheduleGrid;
  staff: ScheduleStaff[];
};

type ProfileRow = {
  id: string;
  full_name: string;
  online_status: Database['public']['Enums']['online_status'];
  role: Database['public']['Enums']['user_role'];
};

type CaseRelation = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  is_urgent: boolean;
  is_deleted: boolean;
  is_internal: boolean;
};

type TaskRelation = {
  id: string;
  name: string;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  is_urgent: boolean;
  is_overdue: boolean;
  is_deleted: boolean;
  reminder_date: string | null;
  deadline_date: string | null;
  remind_days_before: number | null;
  cases: CaseRelation | CaseRelation[] | null;
};

type AssignmentRow = {
  id: string;
  task_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  tasks: TaskRelation | TaskRelation[] | null;
};

const ASSIGNMENT_SELECT = `
  id,
  task_id,
  staff_id,
  start_time,
  end_time,
  duration_minutes,
  tasks (
    id,
    name,
    abbreviation,
    status,
    is_urgent,
    is_overdue,
    reminder_date,
    deadline_date,
    remind_days_before,
    is_deleted,
    cases (
      id,
      reference,
      client_first_name,
      client_last_name,
      is_urgent,
      is_deleted,
      is_internal
    )
  )
`;

function asSingleRelation<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function timetableHours(
  row: Database['public']['Tables']['staff_timetables']['Row'] | undefined,
  date: string,
): TimeInterval | null {
  if (!row) {
    return null;
  }

  const day = dayKeyForDate(date);
  const start = shortTime(row[`${day}_start`]);
  const end = shortTime(row[`${day}_end`]);

  if (!start || !end) {
    return null;
  }

  return { start, end };
}

function mapAssignment(row: AssignmentRow): ScheduleAssignment {
  const task = asSingleRelation(row.tasks);
  const caseRow = task ? asSingleRelation(task.cases) : null;
  const taskMissing = !task && Boolean(row.task_id);

  return {
    id: row.id,
    task_id: row.task_id,
    task_name: task?.name ?? 'Task',
    task_abbreviation: task?.abbreviation ?? '—',
    task_status: task?.status ?? 'not_started',
    case_id: caseRow?.id ?? null,
    case_reference: caseRow?.reference ?? null,
    client_name: caseRow
      ? `${caseRow.client_first_name} ${caseRow.client_last_name}`.trim()
      : null,
    start_time: shortTime(row.start_time) ?? row.start_time,
    end_time: shortTime(row.end_time) ?? row.end_time,
    duration_minutes: row.duration_minutes,
    is_urgent:
      !taskMissing &&
      (task?.is_urgent === true || caseRow?.is_urgent === true),
    is_overdue: task?.is_overdue === true,
    reminder_date: task?.reminder_date ?? null,
    deadline_date: task?.deadline_date ?? null,
    remind_days_before: task?.remind_days_before ?? null,
    case_deleted: caseRow?.is_deleted === true || taskMissing,
    task_deleted: task?.is_deleted === true || taskMissing,
    case_is_internal: caseRow?.is_internal === true,
  };
}

function intervalMinutes(intervals: TimeInterval[]): number {
  return intervals.reduce(
    (total, interval) => total + (toMinutes(interval.end) - toMinutes(interval.start)),
    0,
  );
}

export type FetchScheduleOptions = {
  /** EP-25 restricts the grid to a single staff member. */
  staffId?: string;
};

export async function fetchSchedule(
  client: SupabaseClient<Database>,
  date: string,
  options: FetchScheduleOptions = {},
): Promise<SchedulePayload> {
  let profileQuery = client
    .from('profiles')
    .select('id, full_name, online_status, role')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (options.staffId) {
    profileQuery = profileQuery.eq('id', options.staffId);
  } else {
    profileQuery = profileQuery.in('role', ['staff', 'senior']);
  }

  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError) {
    throw profileError;
  }

  const staffIds = (profiles ?? []).map((row) => row.id);

  if (staffIds.length === 0) {
    return {
      date,
      grid: { slot_minutes: SLOT_MINUTES, start_time: null, end_time: null, times: [] },
      staff: [],
    };
  }

  const [
    { data: timetables, error: timetableError },
    { data: assignments, error: assignmentError },
  ] = await Promise.all([
    client.from('staff_timetables').select('*').in('staff_id', staffIds),
    client
      .from('task_assignments')
      .select(ASSIGNMENT_SELECT)
      .in('staff_id', staffIds)
      .eq('date', date)
      .eq('is_released', false)
      .order('start_time', { ascending: true }),
  ]);

  // A silent timetable failure would render every column as a day off, so it
  // has to surface as an error rather than as a plausible-looking empty grid.
  if (timetableError) {
    throw timetableError;
  }

  if (assignmentError) {
    throw assignmentError;
  }

  const timetableByStaff = new Map((timetables ?? []).map((row) => [row.staff_id, row]));

  const assignmentsByStaff = new Map<string, ScheduleAssignment[]>();
  for (const row of (assignments ?? []) as unknown as AssignmentRow[]) {
    const list = assignmentsByStaff.get(row.staff_id) ?? [];
    list.push(mapAssignment(row));
    assignmentsByStaff.set(row.staff_id, list);
  }

  const workingHoursByStaff = new Map<string, TimeInterval | null>();
  for (const profile of (profiles ?? []) as ProfileRow[]) {
    workingHoursByStaff.set(
      profile.id,
      timetableHours(timetableByStaff.get(profile.id), date),
    );
  }

  // Assignments join the range calculation so an overtime booking outside every
  // timetable still gets a row to render in.
  const range = computeGridRange([
    ...workingHoursByStaff.values(),
    ...[...assignmentsByStaff.values()].flatMap((list) =>
      list.map((assignment) => ({ start: assignment.start_time, end: assignment.end_time })),
    ),
  ]);

  const timeline = buildSlotTimeline(range);

  const staff: ScheduleStaff[] = ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const workingHours = workingHoursByStaff.get(profile.id) ?? null;
    const staffAssignments = assignmentsByStaff.get(profile.id) ?? [];
    const busy = staffAssignments.map((assignment) => ({
      id: assignment.id,
      start: assignment.start_time,
      end: assignment.end_time,
    }));

    const availableSlots = computeAvailableSlots(workingHours, busy);

    return {
      id: profile.id,
      full_name: profile.full_name,
      online_status: profile.online_status,
      working_hours: workingHours,
      is_on_leave: false,
      assignments: staffAssignments,
      available_slots: availableSlots,
      slots: computeSlotStates({ timeline, workingHours, assignments: busy }),
      working_minutes: workingHours ? intervalMinutes([workingHours]) : 0,
      // Counts every booking, including one placed outside the timetable, so
      // the workload figure can never contradict the blocks drawn on the grid.
      booked_minutes: intervalMinutes(mergeIntervals(busy)),
    };
  });

  return {
    date,
    grid: {
      slot_minutes: SLOT_MINUTES,
      start_time: range?.start ?? null,
      end_time: range?.end ?? null,
      times: timeline,
    },
    staff,
  };
}
