import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  clampHistoryLimit,
  decodeHistoryCursor,
  encodeHistoryCursor,
} from '@/lib/dashboard/history-cursor';
import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';

export type StaffDashboardHistoryPayload = {
  items: StaffDashboardTask[];
  next_cursor: string | null;
  has_more: boolean;
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

const HISTORY_SELECT = `
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
    throw new Error('Staff dashboard history task is missing its case relation.');
  }

  return Array.isArray(value) ? value[0] : value;
}

function dependantSummary(count: number): string | null {
  if (count <= 0) {
    return null;
  }

  return `+${count}`;
}

function mapHistoryRow(row: RawTaskRow): StaffDashboardTask {
  const caseRow = unwrapCase(row);
  const dependants = caseRow.dependants;
  const dependantCount = Array.isArray(dependants) ? dependants.length : 0;

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
    is_today: false,
    current_assignment: null,
    priority_rank: 0,
    completed_at: row.completed_at,
  };
}

export async function fetchStaffDashboardHistory(
  client: SupabaseClient<Database>,
  staffId: string,
  options: { limit?: number; cursor?: string | null; now?: Date } = {},
): Promise<StaffDashboardHistoryPayload> {
  const limit = clampHistoryLimit(options.limit);
  const decodedCursor = options.cursor ? decodeHistoryCursor(options.cursor) : null;

  if (options.cursor && !decodedCursor) {
    return { items: [], next_cursor: null, has_more: false };
  }

  let query = client
    .from('tasks')
    .select(HISTORY_SELECT)
    .eq('assigned_to', staffId)
    .eq('is_deleted', false)
    .eq('status', 'completed')
    .eq('cases.status', 'active')
    .eq('cases.is_deleted', false)
    .order('completed_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (decodedCursor) {
    query = query.or(
      `completed_at.lt.${decodedCursor.completed_at},and(completed_at.eq.${decodedCursor.completed_at},id.lt.${decodedCursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawTaskRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map(mapHistoryRow);

  const last = pageRows[pageRows.length - 1];
  const next_cursor =
    hasMore && last?.completed_at
      ? encodeHistoryCursor(last.completed_at, last.id)
      : null;

  return {
    items,
    next_cursor,
    has_more: hasMore,
  };
}
