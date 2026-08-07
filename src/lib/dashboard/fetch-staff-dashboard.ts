import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { assignStaffPriorityRanks } from '@/lib/utils/priority-schedule';
import { addDays, todayISODate } from '@/lib/utils/dates';

export type StaffDashboardView = 'today' | 'week' | 'all';

export type StaffDashboardAssignment = {
  date: string;
  start_time: string;
  end_time: string;
};

export type StaffDashboardTask = {
  id: string;
  sequence: number;
  name: string;
  abbreviation: string;
  description: string | null;
  case_id: string;
  case_reference: string | null;
  client_name: string;
  dependant_summary: string | null;
  case_is_internal: boolean;
  status: Database['public']['Enums']['task_status'];
  is_urgent: boolean;
  is_overdue: boolean;
  is_today: boolean;
  current_assignment: StaffDashboardAssignment | null;
  priority_rank: number;
  completed_at?: string | null;
};

export type StaffDashboardPayload = {
  today_task_count: number;
  overdue_count: number;
  blocked_count: number;
  due_this_week_count: number;
  priority_list: StaffDashboardTask[];
  firm_tasks: StaffDashboardTask[];
  firm_tasks_history: StaffDashboardTask[];
};

type CaseRelation = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  is_urgent: boolean;
  is_internal: boolean;
  last_date: string | null;
  dependants: { id: string }[] | null;
};

type RawTaskRow = {
  id: string;
  sequence: number;
  name: string;
  abbreviation: string;
  description: string | null;
  status: Database['public']['Enums']['task_status'];
  is_overdue: boolean;
  is_urgent: boolean;
  blocked_at: string | null;
  completed_at: string | null;
  cases: CaseRelation | CaseRelation[] | null;
};

const TASK_SELECT = `
  id,
  sequence,
  name,
  abbreviation,
  description,
  status,
  is_overdue,
  is_urgent,
  blocked_at,
  completed_at,
  cases!inner (
    id,
    reference,
    client_first_name,
    client_last_name,
    is_urgent,
    is_internal,
    last_date,
    dependants ( id )
  )
`;

function unwrapCase(row: RawTaskRow): CaseRelation {
  const value = row.cases;
  if (!value) {
    throw new Error('Staff dashboard task is missing its case relation.');
  }

  return Array.isArray(value) ? value[0] : value;
}

function dependantSummary(count: number): string | null {
  if (count <= 0) {
    return null;
  }

  return `+${count}`;
}

function matchesView(
  task: {
    status: Database['public']['Enums']['task_status'];
    is_overdue: boolean;
    assignmentDate: string | null;
  },
  view: StaffDashboardView,
  today: string,
  weekEnd: string,
): boolean {
  if (view === 'all') {
    return true;
  }

  if (task.status === 'blocked' || task.is_overdue) {
    return true;
  }

  if (view === 'week') {
    if (!task.assignmentDate) {
      return false;
    }

    return task.assignmentDate >= today && task.assignmentDate <= weekEnd;
  }

  if (!task.assignmentDate) {
    return false;
  }

  return task.assignmentDate === today;
}

type MappedTask = StaffDashboardTask & {
  last_date: string | null;
  blocked_at: string | null;
};

async function loadAssignments(
  client: SupabaseClient<Database>,
  staffId: string,
  taskIds: string[],
  today: string,
): Promise<Map<string, StaffDashboardAssignment>> {
  const assignmentByTask = new Map<string, StaffDashboardAssignment>();

  if (taskIds.length === 0) {
    return assignmentByTask;
  }

  const { data: assignments, error: assignmentError } = await client
    .from('task_assignments')
    .select('task_id, date, start_time, end_time')
    .eq('staff_id', staffId)
    .eq('is_released', false)
    .in('task_id', taskIds)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (assignmentError) {
    throw assignmentError;
  }

  const grouped = new Map<string, StaffDashboardAssignment[]>();
  for (const row of assignments ?? []) {
    const list = grouped.get(row.task_id) ?? [];
    list.push({
      date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
    });
    grouped.set(row.task_id, list);
  }

  for (const [taskId, rows] of grouped) {
    const todaySlot = rows.find((row) => row.date === today);
    if (todaySlot) {
      assignmentByTask.set(taskId, todaySlot);
      continue;
    }

    const upcoming = rows.find((row) => row.date > today);
    if (upcoming) {
      assignmentByTask.set(taskId, upcoming);
      continue;
    }

    const past = [...rows].reverse().find((row) => row.date < today);
    if (past) {
      assignmentByTask.set(taskId, past);
    }
  }

  return assignmentByTask;
}

function mapTaskRow(
  row: RawTaskRow,
  assignmentByTask: Map<string, StaffDashboardAssignment>,
  today: string,
): MappedTask {
  const caseRow = unwrapCase(row);
  const dependants = caseRow.dependants;
  const dependantCount = Array.isArray(dependants) ? dependants.length : 0;
  const assignment = assignmentByTask.get(row.id) ?? null;

  return {
    id: row.id,
    sequence: row.sequence,
    name: row.name,
    abbreviation: row.abbreviation,
    description: row.description,
    case_id: caseRow.id,
    case_reference: caseRow.reference,
    client_name: `${caseRow.client_first_name} ${caseRow.client_last_name}`.trim(),
    dependant_summary: dependantSummary(dependantCount),
    case_is_internal: caseRow.is_internal === true,
    status: row.status,
    is_urgent: row.is_urgent || caseRow.is_urgent,
    is_overdue: row.is_overdue,
    is_today: assignment?.date === today,
    last_date: caseRow.last_date,
    current_assignment: assignment,
    blocked_at: row.blocked_at,
    priority_rank: 0,
    completed_at: row.completed_at,
  };
}

function toDashboardTask(task: MappedTask): StaffDashboardTask {
  return {
    id: task.id,
    sequence: task.sequence,
    name: task.name,
    abbreviation: task.abbreviation,
    description: task.description,
    case_id: task.case_id,
    case_reference: task.case_reference,
    client_name: task.client_name,
    dependant_summary: task.dependant_summary,
    case_is_internal: task.case_is_internal,
    status: task.status,
    is_urgent: task.is_urgent,
    is_overdue: task.is_overdue,
    is_today: task.is_today,
    current_assignment: task.current_assignment,
    priority_rank: task.priority_rank,
    completed_at: task.completed_at,
  };
}

export async function fetchStaffDashboard(
  client: SupabaseClient<Database>,
  staffId: string,
  view: StaffDashboardView = 'today',
  now: Date = new Date(),
): Promise<StaffDashboardPayload> {
  const today = todayISODate(now);
  const weekEnd = addDays(today, 6);

  const { data: taskRows, error: taskError } = await client
    .from('tasks')
    .select(TASK_SELECT)
    .eq('assigned_to', staffId)
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .eq('cases.status', 'active')
    .eq('cases.is_deleted', false);

  if (taskError) {
    throw taskError;
  }

  const activeRows = (taskRows ?? []) as RawTaskRow[];
  const taskIds = activeRows.map((row) => row.id);
  const assignmentByTask = await loadAssignments(client, staffId, taskIds, today);

  const mapped = activeRows.map((row) => mapTaskRow(row, assignmentByTask, today));

  const visible = mapped.filter((task) =>
    matchesView(
      {
        status: task.status,
        is_overdue: task.is_overdue,
        assignmentDate: task.current_assignment?.date ?? null,
      },
      view,
      today,
      weekEnd,
    ),
  );

  const todayTaskCount = mapped.filter(
    (task) => task.current_assignment?.date === today && task.status !== 'blocked',
  ).length;
  const overdueCount = mapped.filter((task) => task.is_overdue && task.status !== 'blocked')
    .length;
  const blockedCount = mapped.filter((task) => task.status === 'blocked').length;
  const dueThisWeekCount = mapped.filter((task) => {
    if (task.status === 'completed' || task.status === 'blocked') {
      return false;
    }

    const date = task.current_assignment?.date;
    return Boolean(date && date >= today && date <= weekEnd);
  }).length;

  const priority_list = assignStaffPriorityRanks(visible, today).map((task) =>
    toDashboardTask(task as MappedTask),
  );

  return {
    today_task_count: todayTaskCount,
    overdue_count: overdueCount,
    blocked_count: blockedCount,
    due_this_week_count: dueThisWeekCount,
    priority_list,
    firm_tasks: [],
    firm_tasks_history: [],
  };
}
