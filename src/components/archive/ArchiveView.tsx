'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PURGE_RETENTION_DAYS } from '@/lib/archive/purge-eligibility';

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
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
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

  const eligibleCount = rows.filter((row) => row.purge_eligible).length;

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setBannerError(null);

    try {
      const response = await fetch(`/api/archive?${queryString}`);
      const json = (await response.json()) as {
        data?: ArchiveRow[];
        pagination?: Pagination;
        error?: { message?: string };
      };

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to load archive.');
        return;
      }

      setRows(json.data ?? []);
      setPagination(json.pagination ?? null);
    } catch {
      setBannerError('Unable to connect. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

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
      await loadArchive();
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
      await loadArchive();
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

      {bannerError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {bannerError}
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
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-4 py-4" colSpan={5}>
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                  No archived records.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{TYPE_LABELS[row.type]}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{row.label}</div>
                    {row.case_reference && row.type !== 'case' && (
                      <div className="text-xs text-slate-500">{row.case_reference}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.deleted_by_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDeletedAt(row.deleted_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void restoreRecord(row)}
                      disabled={restoringId === row.id}
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
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">Purge expired records?</h2>
            <p className="mt-2 text-sm text-slate-600">
              {`Permanently delete records older than ${DEFAULT_PURGE_RETENTION_DAYS} days? This cannot be undone.`}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {eligibleCount} record(s) on this page are eligible.
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
                disabled={purging}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {purging ? 'Purging…' : 'Purge All Expired'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
