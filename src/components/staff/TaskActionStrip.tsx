'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';

type ApiError = {
  error?: { message?: string };
};

const actionButtonClass =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 text-base text-primary hover:bg-page disabled:opacity-50';

type TaskActionStripProps = {
  task: StaffDashboardTask;
  onStatusChanged: () => void;
  showOpenCase?: boolean;
};

export default function TaskActionStrip({
  task,
  onStatusChanged,
  showOpenCase = true,
}: TaskActionStripProps) {
  const [loading, setLoading] = useState<'completed' | 'in_progress' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (task.status === 'blocked' || task.status === 'completed') {
    return null;
  }

  async function patchStatus(status: 'in_progress' | 'completed') {
    setLoading(status);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const json = (await response.json()) as ApiError;
      if (!response.ok) {
        setError(json.error?.message ?? 'Failed to update task status.');
        return;
      }

      onStatusChanged();
    } catch {
      setError('Failed to update task status.');
    } finally {
      setLoading(null);
    }
  }

  const showComplete = task.status === 'not_started' || task.status === 'in_progress';
  const showInProgress = task.status === 'not_started';
  const showCaseLink = showOpenCase && !task.case_is_internal;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {showComplete && (
          <button
            type="button"
            onClick={() => patchStatus('completed')}
            disabled={loading !== null}
            aria-label="Mark task complete"
            className={actionButtonClass}
          >
            {loading === 'completed' ? '…' : '✓'}
          </button>
        )}
        {showInProgress && (
          <button
            type="button"
            onClick={() => patchStatus('in_progress')}
            disabled={loading !== null}
            aria-label="Mark task in progress"
            className={actionButtonClass}
          >
            {loading === 'in_progress' ? '…' : '◉'}
          </button>
        )}
        {showCaseLink && (
          <Link
            href={`/staff/cases/${task.case_id}?task=${task.id}`}
            aria-label="Open case"
            className={actionButtonClass}
          >
            📁
          </Link>
        )}
      </div>
      {error && <p className="max-w-[12rem] text-right text-xs text-error">{error}</p>}
    </div>
  );
}
