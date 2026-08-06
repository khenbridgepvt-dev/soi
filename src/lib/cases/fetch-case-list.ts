import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ParsedCaseListQuery } from '@/lib/cases/list-query';

type TaskRow = {
  id: string;
  sequence: number;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  is_deleted: boolean;
  is_overdue: boolean;
  blocked_at: string | null;
};

type DependantRow = {
  id: string;
  is_deleted: boolean;
};

type ApplicationTypeRow = {
  name: string;
};

export type CaseListRow = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  dependant_count: number;
  application_type_name: string;
  status: Database['public']['Enums']['case_status'];
  is_urgent: boolean;
  last_date: string | null;
  appointment_date: string | null;
  assigned_staff_name: string | null;
  task_completed_count: number;
  task_total_count: number;
  has_blocked_tasks: boolean;
  created_at: string;
};

type RawCaseRow = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  status: Database['public']['Enums']['case_status'];
  is_urgent: boolean;
  last_date: string | null;
  appointment_date: string | null;
  created_at: string;
  application_types: ApplicationTypeRow | ApplicationTypeRow[] | null;
  dependants: DependantRow[] | null;
  tasks: TaskRow[] | null;
};

const CASE_LIST_BASE_SELECT = `
  id,
  reference,
  client_first_name,
  client_last_name,
  status,
  is_urgent,
  last_date,
  appointment_date,
  created_at,
  application_types ( name ),
  dependants ( id, is_deleted ),
  tasks (
    id,
    sequence,
    status,
    assigned_to,
    is_deleted,
    is_overdue,
    blocked_at
  )
`;

const CASE_LIST_INNER_TASK_SELECT = `
  id,
  reference,
  client_first_name,
  client_last_name,
  status,
  is_urgent,
  last_date,
  appointment_date,
  created_at,
  application_types ( name ),
  dependants ( id, is_deleted ),
  tasks!inner (
    id,
    sequence,
    status,
    assigned_to,
    is_deleted,
    is_overdue,
    blocked_at
  )
`;

function asSingleRelation<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function activeTasks(tasks: TaskRow[] | null | undefined): TaskRow[] {
  return (tasks ?? []).filter((task) => !task.is_deleted);
}

function activeDependants(dependants: DependantRow[] | null | undefined): DependantRow[] {
  return (dependants ?? []).filter((dep) => !dep.is_deleted);
}

function primaryAssignedStaffId(tasks: TaskRow[]): string | null {
  const assigned = tasks
    .filter((task) => task.assigned_to)
    .sort((a, b) => a.sequence - b.sequence);

  return assigned[0]?.assigned_to ?? null;
}

export function mapCaseListRow(
  row: RawCaseRow,
  staffNames: Record<string, string>,
): CaseListRow {
  const tasks = activeTasks(row.tasks);
  const dependants = activeDependants(row.dependants);
  const applicationType = asSingleRelation(row.application_types);
  const assignedStaffId = primaryAssignedStaffId(tasks);

  return {
    id: row.id,
    reference: row.reference,
    client_first_name: row.client_first_name,
    client_last_name: row.client_last_name,
    dependant_count: dependants.length,
    application_type_name: applicationType?.name ?? '—',
    status: row.status,
    is_urgent: row.is_urgent,
    last_date: row.last_date,
    appointment_date: row.appointment_date,
    assigned_staff_name: assignedStaffId ? staffNames[assignedStaffId] ?? null : null,
    task_completed_count: tasks.filter((task) => task.status === 'completed').length,
    task_total_count: tasks.length,
    has_blocked_tasks: tasks.some((task) => task.status === 'blocked'),
    created_at: row.created_at,
  };
}

function needsInnerTaskJoin(query: ParsedCaseListQuery): boolean {
  return Boolean(
    query.assignedTo || query.urgency === 'blocked' || query.urgency === 'overdue',
  );
}

export async function fetchCaseList(
  supabase: SupabaseClient<Database>,
  query: ParsedCaseListQuery,
): Promise<{ rows: CaseListRow[]; total: number }> {
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;
  const selectClause = needsInnerTaskJoin(query)
    ? CASE_LIST_INNER_TASK_SELECT
    : CASE_LIST_BASE_SELECT;

  let request = supabase
    .from('cases')
    .select(selectClause, { count: 'exact' })
    .eq('is_deleted', false)
    .eq('is_internal', false);

  if (query.status) {
    request = request.eq('status', query.status);
  }

  if (query.applicationTypeId) {
    request = request.eq('application_type_id', query.applicationTypeId);
  }

  if (query.isUrgent !== undefined) {
    request = request.eq('is_urgent', query.isUrgent);
  }

  if (query.assignedTo) {
    request = request.eq('tasks.assigned_to', query.assignedTo).eq('tasks.is_deleted', false);
  }

  if (query.urgency === 'blocked') {
    request = request.eq('tasks.status', 'blocked').eq('tasks.is_deleted', false);
  }

  if (query.urgency === 'overdue') {
    request = request.eq('tasks.is_overdue', true).eq('tasks.is_deleted', false);
  }

  if (query.q) {
    const sanitized = query.q.replace(/"/g, '');
    const term = `%${sanitized}%`;
    request = request.or(
      `reference.ilike."${term}",client_first_name.ilike."${term}",client_last_name.ilike."${term}"`,
    );
  }

  request = request.order(query.sortBy, { ascending: query.sortOrder === 'asc' });

  const useClientPagination = query.assignedToUnassigned;
  const { data, error, count } = await (useClientPagination
    ? request.limit(500)
    : request.range(from, to));

  if (error) {
    throw error;
  }

  const rawRows = (data ?? []) as unknown as RawCaseRow[];

  const staffIds = new Set<string>();
  for (const row of rawRows) {
    const tasks = activeTasks(row.tasks);
    for (const task of tasks) {
      if (task.assigned_to) {
        staffIds.add(task.assigned_to);
      }
    }
  }

  const staffNames: Record<string, string> = {};
  if (staffIds.size > 0) {
    const ids = Array.from(staffIds);

    const { data: staffRows } = await supabase
      .from('profiles_staff_view')
      .select('id, full_name')
      .in('id', ids);

    for (const staff of staffRows ?? []) {
      if (staff.id && staff.full_name) {
        staffNames[staff.id] = staff.full_name;
      }
    }

    const missingIds = ids.filter((id) => !staffNames[id]);
    if (missingIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', missingIds);

      for (const profile of adminProfiles ?? []) {
        staffNames[profile.id] = profile.full_name;
      }
    }
  }

  let rows = rawRows.map((row) => mapCaseListRow(row, staffNames));

  if (query.assignedToUnassigned) {
    rows = rows.filter((row) => !row.assigned_staff_name);
    const totalUnassigned = rows.length;
    rows = rows.slice(from, from + query.limit);
    return { rows, total: totalUnassigned };
  }

  const total = count ?? rows.length;

  return { rows, total };
}
