'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AssignTaskModal, {
  type AssignTaskModalPrefill,
} from '@/components/schedule/AssignTaskModal';
import Toast from '@/components/ui/Toast';
import { queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import { formatBlockedAge } from '@/lib/utils/blocked-age';

type BlockedTaskRow = {
  id: string;
  name: string;
  abbreviation: string;
  blocked_at: string;
  blocked_reason: string | null;
  case_id: string;
  case_reference: string | null;
  client_name: string;
  dependant_count: number;
  staff_id: string | null;
  staff_name: string | null;
};

type StaffOption = {
  id: string;
  full_name: string;
};

type ApiError = {
  error?: { message?: string };
};

function clientLabel(row: BlockedTaskRow): string {
  if (row.dependant_count > 0) {
    return `${row.client_name} +${row.dependant_count}`;
  }

  return row.client_name;
}

export default function BlockedTasksPool() {
  const invalidate = useInvalidateAfterMutation();
  const [staffFilter, setStaffFilter] = useState('');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    prefill: AssignTaskModalPrefill | null;
  }>({ open: false, prefill: null });

  const { data: staffOptions = [] } = useQuery({
    queryKey: queryKeys.staff.filterOptions(),
    queryFn: async () => {
      const response = await fetch('/api/staff?is_active=true');
      const json = (await response.json()) as { data?: StaffOption[] };
      return (json.data ?? []).filter((member) => member.id && member.full_name);
    },
  });

  const {
    data: rows = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.blocked.list(staffFilter || undefined),
    queryFn: async () => {
      const query = staffFilter ? `?staff_id=${staffFilter}` : '';
      const response = await fetch(`/api/tasks/blocked${query}`);
      const json = (await response.json()) as { data?: BlockedTaskRow[] } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load blocked tasks.');
      }

      return json.data ?? [];
    },
  });

  const loadError =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;
  const displayError = bannerError ?? loadError;

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (left, right) =>
          new Date(right.blocked_at).getTime() - new Date(left.blocked_at).getTime(),
      ),
    [rows],
  );

  async function handleUnblock(taskId: string, caseId: string) {
    setActionTaskId(taskId);
    setBannerError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/unblock`, { method: 'POST' });
      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to unblock task.');
        return;
      }

      setToastMessage('Task unblocked. Reassign a time slot in the scheduling grid.');
      void invalidate('unblock', { caseId });
      void refetch();
    } catch {
      setBannerError('Failed to unblock task.');
    } finally {
      setActionTaskId(null);
    }
  }

  function openReassign(row: BlockedTaskRow) {
    setAssignModal({
      open: true,
      prefill: {
        taskId: row.id,
        taskName: row.name,
        caseId: row.case_id,
        caseReference: row.case_reference ?? undefined,
        caseLabel: row.case_reference
          ? `${row.case_reference} — ${clientLabel(row)}`
          : clientLabel(row),
        staffId: row.staff_id ?? undefined,
      },
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Blocked tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tasks awaiting client response. Time slots are released for reassignment.
          </p>
        </div>
        <p className="rounded-md border border-status-blocked-border bg-status-blocked-bg px-3 py-1.5 text-sm font-medium text-text-secondary">
          {rows.length} task{rows.length === 1 ? '' : 's'} blocked
        </p>
      </div>

      {displayError && (
        <div className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {displayError}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-text-secondary" htmlFor="blocked-staff-filter">
          Filter staff
        </label>
        <select
          id="blocked-staff-filter"
          value={staffFilter}
          onChange={(event) => setStaffFilter(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {staffOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-page" />
          ))}
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          No blocked tasks right now.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-page text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Case / client</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Blocked since</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border bg-status-blocked-bg"
                  style={{ boxShadow: 'inset 4px 0 0 #8B7355' }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/cases/${row.case_id}`}
                      className="font-medium text-text hover:underline"
                    >
                      <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                        BLOCKED ⊘
                      </span>
                      {row.name}
                    </Link>
                    {row.blocked_reason && (
                      <p className="mt-1 text-xs text-text-muted">{row.blocked_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/cases/${row.case_id}`} className="hover:underline">
                      <p className="font-medium text-text">
                        {row.case_reference ?? 'No reference'}
                      </p>
                      <p className="text-xs text-text-secondary">{clientLabel(row)}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text">{row.staff_name ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {formatBlockedAge(row.blocked_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionTaskId === row.id}
                        onClick={() => handleUnblock(row.id, row.case_id)}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-page disabled:opacity-50"
                      >
                        Unblock
                      </button>
                      <button
                        type="button"
                        onClick={() => openReassign(row)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
                      >
                        Reassign
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssignTaskModal
        open={assignModal.open}
        prefill={assignModal.prefill}
        onClose={() => setAssignModal({ open: false, prefill: null })}
        onAssigned={(message) => {
          setToastMessage(message);
          setAssignModal({ open: false, prefill: null });
          void refetch();
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
