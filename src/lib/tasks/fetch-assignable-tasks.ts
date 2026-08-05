import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type AssignableTaskItem = {
  id: string;
  name: string;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  case_id: string;
};

export type AssignableCaseGroup = {
  case_id: string;
  reference: string | null;
  client_name: string;
  application_type_name: string;
  unassigned_task_count: number;
  tasks: AssignableTaskItem[];
};

/** @deprecated Flat shape — use AssignableCaseGroup via fetchAssignableCasesGrouped. */
export type AssignableTask = {
  id: string;
  name: string;
  abbreviation: string;
  case_id: string;
  case_reference: string | null;
  client_name: string;
};

type FetchAssignableTasksOptions = {
  caseId?: string;
  q?: string;
};

type RawAssignableRow = {
  id: string;
  name: string;
  abbreviation: string;
  sequence: number;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  cases: {
    id: string;
    reference: string | null;
    client_first_name: string;
    client_last_name: string;
    status: string;
    application_types: { name: string } | { name: string }[] | null;
  } | {
    id: string;
    reference: string | null;
    client_first_name: string;
    client_last_name: string;
    status: string;
    application_types: { name: string } | { name: string }[] | null;
  }[] | null;
};

function unwrapCase(row: RawAssignableRow) {
  if (!row.cases) {
    return null;
  }

  return Array.isArray(row.cases) ? row.cases[0] : row.cases;
}

function unwrapApplicationType(
  value: { name: string } | { name: string }[] | null | undefined,
): string {
  if (!value) {
    return 'Unknown';
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? 'Unknown';
}

/** Groups flat task rows into case buckets; filters by search query. Pure — unit tested. */
export function groupAssignableCases(
  rows: RawAssignableRow[],
  options: { q?: string; caseId?: string } = {},
): AssignableCaseGroup[] {
  const normalizedQuery = options.q?.trim().toLowerCase() ?? '';
  const groups = new Map<string, AssignableCaseGroup>();

  for (const row of rows) {
    const caseRow = unwrapCase(row);
    if (!caseRow) {
      continue;
    }

    if (options.caseId && caseRow.id !== options.caseId) {
      continue;
    }

    const clientName = `${caseRow.client_first_name} ${caseRow.client_last_name}`.trim();
    const reference = caseRow.reference ?? '';
    const applicationTypeName = unwrapApplicationType(caseRow.application_types);

    if (normalizedQuery) {
      const haystack = `${reference} ${clientName} ${applicationTypeName}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        continue;
      }
    }

    const task: AssignableTaskItem = {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      status: row.status,
      assigned_to: row.assigned_to,
      case_id: caseRow.id,
    };

    const existing = groups.get(caseRow.id);
    if (existing) {
      existing.tasks.push(task);
      if (!row.assigned_to) {
        existing.unassigned_task_count += 1;
      }
      continue;
    }

    groups.set(caseRow.id, {
      case_id: caseRow.id,
      reference: caseRow.reference,
      client_name: clientName || 'Unknown client',
      application_type_name: applicationTypeName,
      unassigned_task_count: row.assigned_to ? 0 : 1,
      tasks: [task],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      tasks: group.tasks,
    }))
    .sort((left, right) => {
      const leftKey = left.reference ?? left.client_name;
      const rightKey = right.reference ?? right.client_name;
      return leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
    });
}

async function fetchAssignableRows(
  client: SupabaseClient<Database>,
  caseId?: string,
): Promise<RawAssignableRow[]> {
  let query = client
    .from('tasks')
    .select(
      `
      id,
      name,
      abbreviation,
      sequence,
      status,
      assigned_to,
      cases!inner (
        id,
        reference,
        client_first_name,
        client_last_name,
        status,
        application_types ( name )
      )
    `,
    )
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .eq('cases.status', 'active')
    .order('sequence', { ascending: true });

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as RawAssignableRow[];
}

export async function fetchAssignableCasesGrouped(
  client: SupabaseClient<Database>,
  options: FetchAssignableTasksOptions = {},
): Promise<AssignableCaseGroup[]> {
  const rows = await fetchAssignableRows(client, options.caseId);
  return groupAssignableCases(rows, options);
}

/** Flat list kept for callers that need a single-case task array. */
export async function fetchAssignableTasks(
  client: SupabaseClient<Database>,
  options: FetchAssignableTasksOptions = {},
): Promise<AssignableTask[]> {
  const groups = await fetchAssignableCasesGrouped(client, options);

  return groups.flatMap((group) =>
    group.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      abbreviation: task.abbreviation,
      case_id: group.case_id,
      case_reference: group.reference,
      client_name: group.client_name,
    })),
  );
}
