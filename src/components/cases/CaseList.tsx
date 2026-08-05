'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CreateCaseIntake from '@/components/cases/CreateCaseIntake';
import DeleteCaseButton from '@/components/cases/DeleteCaseButton';
import LeadReviewModal, { type LeadReviewTarget } from '@/components/cases/LeadReviewModal';
import {
  CASE_LIST_SORT_FIELDS,
  type CaseListSortField,
} from '@/lib/cases/list-query';
import { queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

type CaseListRow = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  dependant_count: number;
  application_type_name: string;
  status: 'lead_pending' | 'active' | 'rejected' | 'completed';
  is_urgent: boolean;
  last_date: string | null;
  appointment_date: string | null;
  assigned_staff_name: string | null;
  task_completed_count: number;
  task_total_count: number;
  has_blocked_tasks: boolean;
  created_at: string;
};

type ApplicationTypeOption = {
  id: string;
  name: string;
};

type StaffOption = {
  id: string;
  full_name: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

type CaseListProps = {
  applicationTypes?: ApplicationTypeOption[];
  staffMembers?: StaffOption[];
};

type ApiError = {
  error?: { message?: string };
};

const SORT_LABELS: Record<CaseListSortField, string> = {
  created_at: 'Created',
  client_last_name: 'Client name',
  status: 'Status',
  last_date: 'Last date',
};

const STATUS_LABELS: Record<CaseListRow['status'], string> = {
  lead_pending: 'Lead Pending',
  active: 'Active',
  rejected: 'Rejected',
  completed: 'Completed',
};

const STATUS_BADGE_CLASS: Record<CaseListRow['status'], string> = {
  lead_pending: 'bg-[#ECEFF3] text-[#5C6B7A]',
  active: 'bg-[#E8F4FD] text-[#0F2B5B]',
  rejected: 'bg-[#FEE2E2] text-[#C41E24]',
  completed: 'bg-[#E8F5EC] text-[#1B7F4B]',
};

export default function CaseList({
  applicationTypes: applicationTypesProp,
  staffMembers: staffMembersProp,
}: CaseListProps) {
  const router = useRouter();
  const invalidate = useInvalidateAfterMutation();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [typeId, setTypeId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [urgency, setUrgency] = useState('');
  const [sortBy, setSortBy] = useState<CaseListSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [reviewLead, setReviewLead] = useState<LeadReviewTarget | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '25');

    if (search.trim()) {
      params.set('q', search.trim());
    }
    if (status) {
      params.set('status', status);
    }
    if (typeId) {
      params.set('application_type_id', typeId);
    }
    if (staffId) {
      params.set('assigned_to', staffId);
    }
    if (urgency === 'urgent') {
      params.set('is_urgent', 'true');
    } else if (urgency) {
      params.set('urgency', urgency);
    }

    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);

    return params.toString();
  }, [page, search, status, typeId, staffId, urgency, sortBy, sortOrder]);

  const listFilters = useMemo(() => ({ queryString }), [queryString]);

  const {
    data: applicationTypesQuery,
    isLoading: applicationTypesLoading,
  } = useQuery({
    queryKey: queryKeys.applicationTypes(),
    queryFn: async () => {
      const response = await fetch('/api/application-types?is_active=true');
      const json = (await response.json()) as { data?: ApplicationTypeOption[] } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load application types.');
      }

      return json.data ?? [];
    },
    enabled: !applicationTypesProp,
  });

  const {
    data: staffMembersQuery,
    isLoading: staffMembersLoading,
  } = useQuery({
    queryKey: queryKeys.staff.filterOptions(),
    queryFn: async () => {
      const response = await fetch('/api/staff');
      const json = (await response.json()) as {
        data?: Array<{ id: string; full_name: string }>;
      } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load staff members.');
      }

      return (json.data ?? []).map((member) => ({
        id: member.id,
        full_name: member.full_name,
      }));
    },
    enabled: !staffMembersProp,
  });

  const applicationTypes = applicationTypesProp ?? applicationTypesQuery ?? [];
  const staffMembers = staffMembersProp ?? staffMembersQuery ?? [];

  const {
    data: casesData,
    isLoading: casesLoading,
    isError: casesError,
    error: casesQueryError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: queryKeys.cases.list(listFilters),
    queryFn: async () => {
      const response = await fetch(`/api/cases?${queryString}`);
      const json = (await response.json()) as {
        data?: CaseListRow[];
        pagination?: Pagination;
      } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load cases.');
      }

      return {
        cases: json.data ?? [],
        pagination: json.pagination ?? null,
      };
    },
  });

  const cases = casesData?.cases ?? [];
  const pagination = casesData?.pagination ?? null;
  const loading =
    casesLoading || applicationTypesLoading || staffMembersLoading;
  const listErrorMessage =
    casesError && casesQueryError instanceof Error
      ? casesQueryError.message
      : casesError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  const displayError = listErrorMessage;

  function clearFilters() {
    setSearch('');
    setStatus('');
    setTypeId('');
    setStaffId('');
    setUrgency('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  }

  function toggleSort(column: CaseListSortField) {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortOrder(column === 'client_last_name' ? 'asc' : 'desc');
  }

  function sortIndicator(column: CaseListSortField): string {
    if (sortBy !== column) {
      return '';
    }

    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  }

  const hasFilters = search || status || typeId || staffId || urgency;

  async function openLeadReview(caseRow: CaseListRow) {
    try {
      const response = await fetch(`/api/cases/${caseRow.id}`);
      const json = (await response.json()) as {
        data?: LeadReviewTarget & { notes?: string | null };
      };

      if (response.ok && json.data) {
        setReviewLead({
          id: json.data.id,
          client_first_name: json.data.client_first_name,
          client_last_name: json.data.client_last_name,
          application_type_name: json.data.application_type_name,
          application_type_code: json.data.application_type_code,
          notes: json.data.notes,
        });
        return;
      }
    } catch {
      // Fall back to list row data when detail fetch fails.
    }

    setReviewLead({
      id: caseRow.id,
      client_first_name: caseRow.client_first_name,
      client_last_name: caseRow.client_last_name,
      application_type_name: caseRow.application_type_name,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Cases</h1>
        <button
          type="button"
          onClick={() => setIntakeOpen(true)}
          className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white"
        >
          + New case
        </button>
      </div>

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {displayError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {displayError}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-6">
        <input
          type="search"
          placeholder="Search cases..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="lead_pending">Lead — Pending</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={typeId}
          onChange={(event) => {
            setTypeId(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {applicationTypes.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <select
          value={staffId}
          onChange={(event) => {
            setStaffId(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All staff</option>
          <option value="unassigned">Unassigned</option>
          {staffMembers.map((staff) => (
            <option key={staff.id} value={staff.id}>{staff.full_name}</option>
          ))}
        </select>
        <select
          value={urgency}
          onChange={(event) => {
            setUrgency(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All urgency</option>
          <option value="urgent">Urgent</option>
          <option value="blocked">Blocked</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => {
            const next = event.target.value as CaseListSortField;
            if (CASE_LIST_SORT_FIELDS.includes(next)) {
              setSortBy(next);
              setPage(1);
            }
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Sort cases by"
        >
          {CASE_LIST_SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              Sort: {SORT_LABELS[field]}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(event) => {
            setSortOrder(event.target.value === 'asc' ? 'asc' : 'desc');
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Sort order"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort('client_last_name')}
                  className="inline-flex items-center gap-1 hover:text-slate-700"
                >
                  Client{sortIndicator('client_last_name')}
                </button>
              </th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort('status')}
                  className="inline-flex items-center gap-1 hover:text-slate-700"
                >
                  Status{sortIndicator('status')}
                </button>
              </th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Urgent</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-4 py-4" colSpan={8}>
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}

            {!loading && cases.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                  {hasFilters
                    ? (
                        <span>
                          No cases match your filters.{' '}
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="font-medium text-[#0F2B5B] underline"
                          >
                            Clear filters
                          </button>
                        </span>
                      )
                    : 'No cases yet.'}
                </td>
              </tr>
            )}

            {!loading &&
              cases.map((caseRow) => {
                const clientLabel =
                  caseRow.dependant_count > 0
                    ? `${caseRow.client_first_name} ${caseRow.client_last_name} +${caseRow.dependant_count} dep`
                    : `${caseRow.client_first_name} ${caseRow.client_last_name}`;
                const progressPct =
                  caseRow.task_total_count > 0
                    ? Math.round(
                        (caseRow.task_completed_count / caseRow.task_total_count) * 100,
                      )
                    : 0;

                return (
                  <tr key={caseRow.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {caseRow.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${caseRow.id}`}
                        className="font-medium text-[#0F2B5B] hover:underline"
                      >
                        {clientLabel}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{caseRow.application_type_name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {caseRow.assigned_staff_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_CLASS[caseRow.status]}`}
                      >
                        {STATUS_LABELS[caseRow.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {caseRow.status === 'lead_pending' || caseRow.task_total_count === 0
                        ? '—'
                        : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded bg-slate-200">
                                <div
                                  className="h-2 rounded bg-[#0F2B5B]"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600">
                                {caseRow.task_completed_count}/{caseRow.task_total_count}
                              </span>
                            </div>
                          )}
                    </td>
                    <td className="px-4 py-3">
                      {caseRow.is_urgent && (
                        <span className="text-red-600" title="Urgent">🔴</span>
                      )}
                      {caseRow.has_blocked_tasks && (
                        <span className="text-xs font-semibold uppercase text-amber-700">
                          BLOCKED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {caseRow.status === 'lead_pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openLeadReview(caseRow)}
                              className="text-xs font-medium text-[#0F2B5B] hover:underline"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={() => openLeadReview(caseRow)}
                              className="text-xs font-medium text-[#C41E24] hover:underline"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {caseRow.status !== 'lead_pending' && (
                          <DeleteCaseButton
                            caseId={caseRow.id}
                            caseLabel={caseRow.reference ?? clientLabel}
                            className="text-xs font-medium text-red-700 hover:underline"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
          <span>
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            type="button"
            disabled={!pagination.has_prev}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!pagination.has_next}
            onClick={() => setPage((current) => current + 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <CreateCaseIntake
        open={intakeOpen}
        applicationTypes={applicationTypes}
        onClose={() => setIntakeOpen(false)}
        onLeadCreated={(message) => {
          setSuccessMessage(message);
          void invalidate('createLead');
          void refetchCases();
        }}
      />

      <LeadReviewModal
        open={reviewLead !== null}
        lead={reviewLead}
        onClose={() => setReviewLead(null)}
        onRejected={(message) => {
          setSuccessMessage(message);
          setReviewLead(null);
          void invalidate('rejectLead');
          void refetchCases();
        }}
        onAccepted={(_message, accepted) => {
          setReviewLead(null);
          // S-08: acceptance lands on the case detail screen (S-06), which
          // carries the confirmation — this list unmounts on navigation.
          router.push(`/cases/${accepted.id}?accepted=1`);
        }}
      />
    </div>
  );
}
