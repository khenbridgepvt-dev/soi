'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import {
  MY_TASKS_COMPLETING_LABEL,
  MY_TASKS_MARK_COMPLETE_LABEL,
  MY_TASKS_START_LABEL,
  MY_TASKS_STARTING_LABEL,
} from '@/lib/tasks/firm-tasks-ui';

type ApiError = {
  error?: { message?: string };
};

const actionButtonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-primary hover:bg-page disabled:opacity-50';

const caseLinkClass =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 text-base text-primary hover:bg-page';

type TaskActionStripProps = {
  task: StaffDashboardTask;
  onStatusChanged: () => void;
  onCompleted?: (taskId: string, previousStatus: 'not_started' | 'in_progress') => void;
  showOpenCase?: boolean;
};

export default function TaskActionStrip({
  task,
  onStatusChanged,
  onCompleted,
  showOpenCase = true,
}: TaskActionStripProps) {
  const [loading, setLoading] = useState<'completed' | 'in_progress' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (task.status === 'blocked' || task.status === 'completed') {
    return null;
  }

  async function patchStatus(status: 'in_progress' | 'completed') {
    const previousStatus = task.status === 'in_progress' ? 'in_progress' : 'not_started';
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

      if (status === 'completed') {
        onCompleted?.(task.id, previousStatus);
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showInProgress && (
          <button
            type="button"
            onClick={() => patchStatus('in_progress')}
            disabled={loading !== null}
            aria-label={MY_TASKS_START_LABEL}
            className={actionButtonClass}
          >
            {loading === 'in_progress' ? MY_TASKS_STARTING_LABEL : MY_TASKS_START_LABEL}
          </button>
        )}
        {showComplete && (
          <button
            type="button"
            onClick={() => patchStatus('completed')}
            disabled={loading !== null}
            aria-label={MY_TASKS_MARK_COMPLETE_LABEL}
            className={actionButtonClass}
          >
            {loading === 'completed' ? MY_TASKS_COMPLETING_LABEL : MY_TASKS_MARK_COMPLETE_LABEL}
          </button>
        )}
        {showCaseLink && (
          <Link
            href={`/staff/cases/${task.case_id}?task=${task.id}`}
            aria-label="Open case"
            className={caseLinkClass}
          >
            📁
          </Link>
        )}
      </div>
      {error && <p className="max-w-[12rem] text-right text-xs text-error">{error}</p>}
    </div>
  );
}
