import type { ArchiveRecordType } from '@/lib/archive/restore-archived';

export const ARCHIVE_RECORD_TYPES = ['case', 'task', 'dependant'] as const;

export type ParsedArchiveQuery = {
  type?: ArchiveRecordType;
  page: number;
  limit: number;
};

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  if (max !== undefined) {
    return Math.min(parsed, max);
  }

  return parsed;
}

export function parseArchiveQuery(searchParams: URLSearchParams): ParsedArchiveQuery {
  const typeParam = searchParams.get('type');
  const type = ARCHIVE_RECORD_TYPES.includes(typeParam as ArchiveRecordType)
    ? (typeParam as ArchiveRecordType)
    : undefined;

  return {
    type,
    page: parsePositiveInt(searchParams.get('page'), 1),
    limit: parsePositiveInt(searchParams.get('limit'), 25, 100),
  };
}
