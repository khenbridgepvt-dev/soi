import type { AppRole } from '@/lib/auth/jwt';

export const CASE_LIST_STATUSES = [
  'lead_pending',
  'active',
  'rejected',
  'completed',
] as const;

export type CaseListStatus = (typeof CASE_LIST_STATUSES)[number];

export const CASE_LIST_SORT_FIELDS = [
  'created_at',
  'client_last_name',
  'status',
  'last_date',
] as const;

export type CaseListSortField = (typeof CASE_LIST_SORT_FIELDS)[number];

export type CaseListUrgency = 'urgent' | 'blocked' | 'overdue';

export type ParsedCaseListQuery = {
  page: number;
  limit: number;
  status?: CaseListStatus;
  isUrgent?: boolean;
  applicationTypeId?: string;
  assignedTo?: string;
  assignedToUnassigned?: boolean;
  urgency?: CaseListUrgency;
  q?: string;
  sortBy: CaseListSortField;
  sortOrder: 'asc' | 'desc';
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function parseCaseListQuery(
  searchParams: URLSearchParams,
  role: AppRole,
): ParsedCaseListQuery {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const limit = parsePositiveInt(searchParams.get('limit'), 25, 100);

  const sortByParam = searchParams.get('sort_by') ?? 'created_at';
  const sortBy = CASE_LIST_SORT_FIELDS.includes(sortByParam as CaseListSortField)
    ? (sortByParam as CaseListSortField)
    : 'created_at';

  const sortOrderParam = searchParams.get('sort_order') ?? 'desc';
  const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

  const statusParam = searchParams.get('status');
  const status = CASE_LIST_STATUSES.includes(statusParam as CaseListStatus)
    ? (statusParam as CaseListStatus)
    : undefined;

  const applicationTypeIdParam = searchParams.get('application_type_id');
  const applicationTypeId =
    applicationTypeIdParam && UUID_RE.test(applicationTypeIdParam)
      ? applicationTypeIdParam
      : undefined;

  let assignedTo: string | undefined;
  let assignedToUnassigned = false;
  const assignedToParam = searchParams.get('assigned_to');
  if (role === 'admin' && assignedToParam) {
    if (assignedToParam === 'unassigned') {
      assignedToUnassigned = true;
    } else if (UUID_RE.test(assignedToParam)) {
      assignedTo = assignedToParam;
    }
  }

  const urgencyParam = searchParams.get('urgency');
  const urgency =
    urgencyParam === 'urgent' || urgencyParam === 'blocked' || urgencyParam === 'overdue'
      ? urgencyParam
      : undefined;

  const isUrgentParam = searchParams.get('is_urgent');
  let isUrgent: boolean | undefined;
  if (isUrgentParam === 'true') {
    isUrgent = true;
  } else if (isUrgentParam === 'false') {
    isUrgent = false;
  } else if (urgency === 'urgent') {
    isUrgent = true;
  }

  const qParam = searchParams.get('q');
  const q = qParam?.trim() ? qParam.trim() : undefined;

  return {
    page,
    limit,
    status,
    isUrgent,
    applicationTypeId,
    assignedTo,
    assignedToUnassigned,
    urgency: urgency && urgency !== 'urgent' ? urgency : undefined,
    q,
    sortBy,
    sortOrder,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
} {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}
