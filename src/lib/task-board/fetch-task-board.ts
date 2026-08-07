import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { resolveTaskBoardToken, type TaskBoardStatusToken } from '@/lib/task-board/card-token';
import { todayISODate } from '@/lib/utils/dates';

export type TaskBoardStaffColumn = {
  id: string;
  full_name: string;
  active_task_count: number;
};

export type TaskBoardCard = {
  id: string;
  case_id: string;
  sequence: number;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  notes: string | null;
  case_notes: string | null;
  is_overdue: boolean;
  is_case_urgent: boolean;
  case_reference: string | null;
  client_first_name: string;
  client_last_name: string;
  dependant_count: number;
  last_date: string | null;
  appointment_date: string | null;
  application_type_code: string;
  application_type_name: string;
  senior_revision_count: number;
  assignment_date: string | null;
  assignment_start_time: string | null;
  assignment_end_time: string | null;
  token: TaskBoardStatusToken;
};

export type TaskBoardPayload = {
  columns: TaskBoardStaffColumn[];
  unassigned_count: number;
  tasks: TaskBoardCard[];
  application_types: Array<{ code: string; name: string }>;
};

type CaseRelation = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  is_urgent: boolean;
  is_internal: boolean;
  last_date: string | null;
  appointment_date: string | null;
  senior_revision_count: number;
  notes: string | null;
  application_types: { code: string; name: string } | { code: string; name: string }[] | null;
  dependants: { id: string }[] | null;
};

type RawTaskRow = {
  id: string;
  sequence: number;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  notes: string | null;
  is_overdue: boolean;
  cases: CaseRelation | CaseRelation[] | null;
};

const TASK_BOARD_SELECT = `
  id,
  sequence,
  abbreviation,
  status,
  assigned_to,
  notes,
  is_overdue,
  cases!inner (
    id,
    reference,
    client_first_name,
    client_last_name,
    is_urgent,
    is_internal,
    last_date,
    appointment_date,
    senior_revision_count,
    notes,
    application_types ( code, name ),
    dependants ( id )
  )
`;

function unwrapCase(row: RawTaskRow): CaseRelation {
  const value = row.cases;
  if (!value) {
    throw new Error('Task board row is missing its case relation.');
  }

  return Array.isArray(value) ? value[0] : value;
}

function unwrapApplicationType(
  value: { code: string; name: string } | { code: string; name: string }[] | null,
): { code: string; name: string } {
  if (Array.isArray(value)) {
    return value[0] ?? { code: 'UNK', name: 'Unknown' };
  }

  return value ?? { code: 'UNK', name: 'Unknown' };
}

function mapTaskRow(
  row: RawTaskRow,
  assignmentByTask: Map<string, { date: string; start_time: string; end_time: string }>,
  now: Date,
): TaskBoardCard {
  const caseRow = unwrapCase(row);
  const applicationType = unwrapApplicationType(caseRow.application_types);
  const dependants = caseRow.dependants;
  const dependantCount = Array.isArray(dependants) ? dependants.length : 0;
  const assignment = assignmentByTask.get(row.id);

  const token = resolveTaskBoardToken({
    status: row.status,
    isOverdue: row.is_overdue,
    isCaseUrgent: caseRow.is_urgent,
    sequence: row.sequence,
    lastDate: caseRow.last_date,
    appointmentDate: caseRow.appointment_date,
    assignmentDate: assignment?.date ?? null,
    assignmentStartTime: assignment?.start_time ?? null,
    assignmentEndTime: assignment?.end_time ?? null,
    now,
  });

  return {
    id: row.id,
    case_id: caseRow.id,
    sequence: row.sequence,
    abbreviation: row.abbreviation,
    status: row.status,
    assigned_to: row.assigned_to,
    notes: row.notes,
    case_notes: caseRow.notes,
    is_overdue: row.is_overdue,
    is_case_urgent: caseRow.is_urgent,
    case_reference: caseRow.reference,
    client_first_name: caseRow.client_first_name,
    client_last_name: caseRow.client_last_name,
    dependant_count: dependantCount,
    last_date: caseRow.last_date,
    appointment_date: caseRow.appointment_date,
    application_type_code: applicationType.code,
    application_type_name: applicationType.name,
    senior_revision_count: caseRow.senior_revision_count,
    assignment_date: assignment?.date ?? null,
    assignment_start_time: assignment?.start_time ?? null,
    assignment_end_time: assignment?.end_time ?? null,
    token,
  };
}

export async function fetchTaskBoard(
  client: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<TaskBoardPayload> {
  const today = todayISODate(now);

  const [{ data: staffProfiles, error: staffError }, { data: activeTaskRows, error: activeError }] =
    await Promise.all([
      client
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .in('role', ['staff', 'senior'])
        .order('full_name', { ascending: true }),
      client
        .from('tasks')
        .select(TASK_BOARD_SELECT)
        .eq('is_deleted', false)
        .in('status', ['not_started', 'in_progress', 'blocked'])
        .eq('cases.status', 'active')
        .eq('cases.is_deleted', false)
        .order('sequence', { ascending: true }),
    ]);

  if (staffError) {
    throw staffError;
  }

  if (activeError) {
    throw activeError;
  }

  const { data: todayAssignments, error: todayAssignmentError } = await client
    .from('task_assignments')
    .select('task_id, date, start_time, end_time')
    .eq('date', today)
    .eq('is_released', false);

  if (todayAssignmentError) {
    throw todayAssignmentError;
  }

  const assignmentByTask = new Map<
    string,
    { date: string; start_time: string; end_time: string }
  >();

  for (const row of todayAssignments ?? []) {
    if (!assignmentByTask.has(row.task_id)) {
      assignmentByTask.set(row.task_id, {
        date: row.date,
        start_time: row.start_time,
        end_time: row.end_time,
      });
    }
  }

  const completedTodayIds = [...assignmentByTask.keys()];
  let completedTaskRows: RawTaskRow[] = [];

  if (completedTodayIds.length > 0) {
    const { data, error: completedError } = await client
      .from('tasks')
      .select(TASK_BOARD_SELECT)
      .eq('is_deleted', false)
      .eq('status', 'completed')
      .in('id', completedTodayIds)
      .eq('cases.status', 'active')
      .eq('cases.is_deleted', false);

    if (completedError) {
      throw completedError;
    }

    completedTaskRows = (data ?? []) as RawTaskRow[];
  }

  const activeIds = new Set((activeTaskRows ?? []).map((row) => row.id));
  const mergedRows = [
    ...((activeTaskRows ?? []) as RawTaskRow[]),
    ...completedTaskRows.filter((row) => !activeIds.has(row.id)),
  ];

  const typeMap = new Map<string, string>();

  const tasks: TaskBoardCard[] = mergedRows.map((row) => {
    const card = mapTaskRow(row, assignmentByTask, now);
    typeMap.set(card.application_type_code, card.application_type_name);
    return card;
  });

  const countByStaff = new Map<string, number>();
  let unassignedCount = 0;

  for (const task of tasks) {
    if (task.status === 'completed') {
      continue;
    }

    if (!task.assigned_to) {
      unassignedCount += 1;
      continue;
    }

    countByStaff.set(task.assigned_to, (countByStaff.get(task.assigned_to) ?? 0) + 1);
  }

  const columns: TaskBoardStaffColumn[] = (staffProfiles ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    active_task_count: countByStaff.get(profile.id) ?? 0,
  }));

  const application_types = [...typeMap.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    columns,
    unassigned_count: unassignedCount,
    tasks,
    application_types,
  };
}
