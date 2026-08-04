'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PURGE_RETENTION_DAYS } from '@/lib/archive/purge-eligibility';
import { queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

type ArchiveRow = {
  id: string;
  type: 'case' | 'task' | 'dependant';
  label: string;
  case_reference: string | null;
  deleted_at: string;
  deleted_by_name: string | null;
  purge_eligible: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

const TYPE_LABELS: Record<ArchiveRow['type'], string> = {
  case: 'Case',
  task: 'Task',
  dependant: 'Dependant',
};

function formatDeletedAt(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ArchiveView() {
  const invalidate = useInvalidateAfterMutation();
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '25');
    if (typeFilter) {
      params.set('type', typeFilter);
    }
    return params.toString();
  }, [page, typeFilter]);

  const archiveFilters = useMemo(() => ({ queryString }), [queryString]);

  const {
    data,
    isLoading: loading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.archive.list(archiveFilters),
    queryFn: async () => {
      const response = await fetch(`/api/archive?${queryString}`);
      const json = (await response.json()) as {
        data?: ArchiveRow[];
        pagination?: Pagination;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load archive.');
      }

      return {
        rows: json.data ?? [],
        pagination: json.pagination ?? null,
      };
    },
  });

  const rows = data?.rows ?? [];
  const pagination = data?.pagination ?? null;
  const loadError =
    isError && queryError instanceof Error
      ? queryError.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;
  const displayError = bannerError ?? loadError;

  const eligibleCount = rows.filter((row) => row.purge_eligible).length;

  async function restoreRecord(row: ArchiveRow) {
    setRestoringId(row.id);
    setBannerError(null);

    try {
      const response = await fetch(`/api/archive/${row.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: row.type }),
      });
      const json = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to restore record.');
        return;
      }

      setSuccessMessage(`${TYPE_LABELS[row.type]} restored.`);
      void invalidate('restoreCase');
      void refetch();
    } catch {
      setBannerError('Unable to restore record right now.');
    } finally {
      setRestoringId(null);
    }
  }

  async function purgeExpired() {
    setPurging(true);
    setBannerError(null);

    try {
      const response = await fetch('/api/archive/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retention_days: DEFAULT_PURGE_RETENTION_DAYS }),
      });
      const json = (await response.json()) as {
        data?: { purged_cases: number; purged_tasks: number; purged_dependants: number };
        error?: { message?: string };
      };

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to purge records.');
        return;
      }

      const total =
        (json.data?.purged_cases ?? 0) +
        (json.data?.purged_tasks ?? 0) +
        (json.data?.purged_dependants ?? 0);

      setSuccessMessage(`${total} expired record(s) permanently deleted.`);
      setPurgeOpen(false);
      void invalidate('purgeArchive');
      void refetch();
    } catch {
      setBannerError('Unable to purge records right now.');
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Archive</h1>
        <button
          type="button"
          onClick={() => setPurgeOpen(true)}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Purge All Expired
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

      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="case">Cases</option>
          <option value="task">Tasks</option>
          <option value="dependant">Dependants</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Name / Ref</th>
              <th className="px-4 py-3">Deleted By</th>
              <th className="px-4 py-3">Deleted</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={5} className="px-4 py-3 text-slate-400">Loading…</td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No archived records.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{TYPE_LABELS[row.type]}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{row.label}</span>
                    {row.case_reference && (
                      <span className="ml-2 text-slate-500">{row.case_reference}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.deleted_by_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDeletedAt(row.deleted_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={restoringId === row.id}
                      onClick={() => void restoreRecord(row)}
                      className="text-sm font-medium text-[#0F2B5B] hover:underline disabled:opacity-50"
                    >
                      {restoringId === row.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
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

      {purgeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-lg font-semibold text-slate-900">Purge expired records?</h2>
            <p className="mt-2 text-sm text-slate-600">
              {eligibleCount} record(s) past the {DEFAULT_PURGE_RETENTION_DAYS}-day retention
              window will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPurgeOpen(false)}
                disabled={purging}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void purgeExpired()}
                disabled={purging || eligibleCount === 0}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {purging ? 'Purging…' : 'Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
