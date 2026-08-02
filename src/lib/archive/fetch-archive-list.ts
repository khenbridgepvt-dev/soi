import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PURGE_RETENTION_DAYS,
  isPurgeEligible,
} from '@/lib/archive/purge-eligibility';
import type { ArchiveRecordType } from '@/lib/archive/restore-archived';
import type { ParsedArchiveQuery } from '@/lib/archive/parse-archive-query';
import type { Database } from '@/types/database';

export type ArchiveListRow = {
  id: string;
  type: ArchiveRecordType;
  label: string;
  case_reference: string | null;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name: string | null;
  purge_eligible: boolean;
};

type ProfileNameRow = {
  id: string;
  full_name: string;
};

async function loadProfileNames(
  client: SupabaseClient<Database>,
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) {
    return {};
  }

  const { data } = await client
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);

  const names: Record<string, string> = {};
  for (const row of (data ?? []) as ProfileNameRow[]) {
    names[row.id] = row.full_name;
  }
  return names;
}

function mapCaseRows(
  rows: Array<{
    id: string;
    reference: string | null;
    client_first_name: string;
    client_last_name: string;
    deleted_at: string | null;
    deleted_by: string | null;
  }>,
  profileNames: Record<string, string>,
  now: Date,
): ArchiveListRow[] {
  return rows.map((row) => ({
    id: row.id,
    type: 'case' as const,
    label: row.reference ?? `${row.client_first_name} ${row.client_last_name}`,
    case_reference: row.reference,
    deleted_at: row.deleted_at ?? '',
    deleted_by: row.deleted_by,
    deleted_by_name: row.deleted_by ? profileNames[row.deleted_by] ?? null : null,
    purge_eligible: isPurgeEligible(row.deleted_at, now, DEFAULT_PURGE_RETENTION_DAYS),
  }));
}

function mapTaskRows(
  rows: Array<{
    id: string;
    abbreviation: string;
    name: string;
    deleted_at: string | null;
    deleted_by: string | null;
    cases: { reference: string | null } | { reference: string | null }[] | null;
  }>,
  profileNames: Record<string, string>,
  now: Date,
): ArchiveListRow[] {
  return rows.map((row) => {
    const caseRow = Array.isArray(row.cases) ? row.cases[0] : row.cases;
    return {
      id: row.id,
      type: 'task' as const,
      label: `${row.abbreviation} · ${row.name}`,
      case_reference: caseRow?.reference ?? null,
      deleted_at: row.deleted_at ?? '',
      deleted_by: row.deleted_by,
      deleted_by_name: row.deleted_by ? profileNames[row.deleted_by] ?? null : null,
      purge_eligible: isPurgeEligible(row.deleted_at, now, DEFAULT_PURGE_RETENTION_DAYS),
    };
  });
}

function mapDependantRows(
  rows: Array<{
    id: string;
    name: string;
    relationship: string;
    deleted_at: string | null;
    deleted_by: string | null;
    cases: { reference: string | null } | { reference: string | null }[] | null;
  }>,
  profileNames: Record<string, string>,
  now: Date,
): ArchiveListRow[] {
  return rows.map((row) => {
    const caseRow = Array.isArray(row.cases) ? row.cases[0] : row.cases;
    return {
      id: row.id,
      type: 'dependant' as const,
      label: `${row.name} (${row.relationship})`,
      case_reference: caseRow?.reference ?? null,
      deleted_at: row.deleted_at ?? '',
      deleted_by: row.deleted_by,
      deleted_by_name: row.deleted_by ? profileNames[row.deleted_by] ?? null : null,
      purge_eligible: isPurgeEligible(row.deleted_at, now, DEFAULT_PURGE_RETENTION_DAYS),
    };
  });
}

/** EP-39 · List soft-deleted records for the archive page. */
export async function fetchArchiveList(
  client: SupabaseClient<Database>,
  query: ParsedArchiveQuery,
): Promise<{ rows: ArchiveListRow[]; total: number }> {
  const now = new Date();
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;
  const types = query.type ? [query.type] : (['case', 'task', 'dependant'] as ArchiveRecordType[]);

  const allRows: ArchiveListRow[] = [];

  if (types.includes('case')) {
    const { data, error } = await client
      .from('cases')
      .select('id, reference, client_first_name, client_last_name, deleted_at, deleted_by')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      throw error;
    }

    const profileNames = await loadProfileNames(
      client,
      (data ?? []).map((row) => row.deleted_by).filter(Boolean) as string[],
    );
    allRows.push(...mapCaseRows(data ?? [], profileNames, now));
  }

  if (types.includes('task')) {
    const { data, error } = await client
      .from('tasks')
      .select('id, abbreviation, name, deleted_at, deleted_by, cases(reference)')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      throw error;
    }

    const profileNames = await loadProfileNames(
      client,
      (data ?? []).map((row) => row.deleted_by).filter(Boolean) as string[],
    );
    allRows.push(...mapTaskRows(data ?? [], profileNames, now));
  }

  if (types.includes('dependant')) {
    const { data, error } = await client
      .from('dependants')
      .select('id, name, relationship, deleted_at, deleted_by, cases(reference)')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      throw error;
    }

    const profileNames = await loadProfileNames(
      client,
      (data ?? []).map((row) => row.deleted_by).filter(Boolean) as string[],
    );
    allRows.push(...mapDependantRows(data ?? [], profileNames, now));
  }

  allRows.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  const total = allRows.length;
  const rows = allRows.slice(from, to + 1);

  return { rows, total };
}
