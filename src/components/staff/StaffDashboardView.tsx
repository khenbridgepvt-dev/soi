'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { StaffDashboardPayload, StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import { queryKeys } from '@/lib/query/keys';

type ApiError = {
  error?: { code?: string; message?: string };
};

function formatSchedule(task: StaffDashboardTask, todayLabel = 'today'): string | null {
  if (!task.current_assignment) {
    return null;
  }

  const { date, start_time: start, end_time: end } = task.current_assignment;
  const startLabel = start.slice(0, 5);
  const endLabel = end.slice(0, 5);
  const dayLabel = task.is_today ? todayLabel : date;

  return `Scheduled: ${startLabel}–${endLabel} ${dayLabel}`;
}

function descriptionSnippet(description: string | null | undefined, max = 80): string | null {
  const value = description?.trim();
  if (!value) {
    return null;
  }

  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function statusLabel(task: StaffDashboardTask): string {
  if (task.status === 'blocked') {
    return 'BLOCKED — Awaiting client';
  }

  if (task.is_urgent) {
    return 'URGENT';
  }

  if (task.is_overdue) {
    return 'OVERDUE';
  }

  return 'On track';
}

function statusBarClass(task: StaffDashboardTask): string {
  if (task.status === 'blocked') {
    return 'border-status-blocked bg-status-blocked';
  }

  if (task.is_urgent || task.is_overdue) {
    return 'border-error bg-error-bg';
  }

  return 'border-status-onTrack bg-status-onTrack';
}

function SummaryMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger' | 'warning';
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-error'
      : tone === 'warning'
        ? 'text-[#B86E00]'
        : 'text-text';

  return (
    <div className="flex-1 px-4 py-3 text-center">
      <p className={`text-[28px] font-semibold leading-tight tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

const actionButtonClass =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 text-base text-primary hover:bg-page disabled:opacity-50';

function TaskActionStrip({
  task,
  onStatusChanged,
}: {
  task: StaffDashboardTask;
  onStatusChanged: () => void;
}) {
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
  const showOpenCase = !task.case_is_internal;

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
        {showOpenCase && (
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

function UnifiedPriorityRow({
  task,
  rank,
  prominent = false,
  onStatusChanged,
}: {
  task: StaffDashboardTask;
  rank: number;
  prominent?: boolean;
  onStatusChanged: () => void;
}) {
  const schedule = formatSchedule(task);
  const snippet = descriptionSnippet(task.description);

  const title = task.case_is_internal ? (
    <p className={`text-sm font-semibold text-text ${prominent ? '' : 'font-medium'}`}>
      {task.name}
    </p>
  ) : prominent ? (
    <p className="text-sm font-semibold text-text">
      {task.name} · {task.case_reference ?? 'No reference'}
    </p>
  ) : (
    <Link
      href={`/staff/cases/${task.case_id}?task=${task.id}`}
      className="text-sm font-medium text-text hover:text-primary"
    >
      {task.name} · {task.case_reference ?? 'No reference'}
    </Link>
  );

  const subtitle = task.case_is_internal ? null : (
    <p className={`text-sm ${prominent ? 'text-text' : 'text-text-secondary'}`}>
      {task.dependant_summary
        ? `${task.client_name} ${task.dependant_summary}`
        : task.client_name}{' '}
      · {statusLabel(task)}
    </p>
  );

  if (prominent) {
    return (
      <div
        className={`rounded-md border border-border bg-surface p-4 ${statusBarClass(task)} border-l-4`}
        data-testid={`next-action-${task.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title}
            {snippet && <p className="mt-1 text-sm text-text-secondary">{snippet}</p>}
            {subtitle}
            {schedule && (
              <p className="mt-1 text-xs font-medium text-text-secondary tabular-nums">
                {schedule}
              </p>
            )}
          </div>
          <TaskActionStrip task={task} onStatusChanged={onStatusChanged} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <span className="w-5 shrink-0 text-sm font-medium text-text-muted tabular-nums">
        {rank}.
      </span>
      <div className="min-w-0 flex-1">
        {title}
        {snippet && <p className="text-sm text-text-secondary">{snippet}</p>}
        {subtitle}
        {schedule && <p className="text-xs text-text-muted tabular-nums">{schedule}</p>}
      </div>
      <TaskActionStrip task={task} onStatusChanged={onStatusChanged} />
    </div>
  );
}

export default function StaffDashboardView() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterMutation();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.staff('today'),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/staff?view=today');
      const json = (await response.json()) as { data?: StaffDashboardPayload } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load dashboard.');
      }

      return (
        json.data ?? {
          today_task_count: 0,
          overdue_count: 0,
          blocked_count: 0,
          due_this_week_count: 0,
          priority_list: [],
          firm_tasks: [],
          firm_tasks_history: [],
        }
      );
    },
  });

  const [showHistory, setShowHistory] = useState(false);

  async function handleStatusChanged() {
    await invalidate('taskStatus');
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.staffAll });
    void refetch();
  }

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  const metrics = data ?? {
    today_task_count: 0,
    overdue_count: 0,
    blocked_count: 0,
    due_this_week_count: 0,
    priority_list: [],
    firm_tasks: [],
    firm_tasks_history: [],
  };

  const topTask = metrics.priority_list[0];
  const restTasks = metrics.priority_list.slice(1);

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
          <SummaryMetric label="Today" value={isLoading ? 0 : metrics.today_task_count} />
          <SummaryMetric
            label="Overdue"
            value={isLoading ? 0 : metrics.overdue_count}
            tone={metrics.overdue_count > 0 ? 'danger' : 'default'}
          />
          <SummaryMetric
            label="Blocked"
            value={isLoading ? 0 : metrics.blocked_count}
            tone={metrics.blocked_count > 0 ? 'warning' : 'default'}
          />
          <SummaryMetric
            label="This week"
            value={isLoading ? 0 : metrics.due_this_week_count}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-text">Your priority list</h2>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-md bg-page" />
              <div className="h-12 animate-pulse rounded-md bg-page" />
            </div>
          )}

          {!isLoading && metrics.priority_list.length === 0 && (
            <p className="py-8 text-center text-sm text-text-secondary">
              You have no assigned tasks. Your administrator will assign tasks to you.
            </p>
          )}

          {!isLoading && topTask && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Next action
              </p>
              <UnifiedPriorityRow
                task={topTask}
                rank={1}
                prominent
                onStatusChanged={handleStatusChanged}
              />
            </div>
          )}

          {!isLoading && restTasks.length > 0 && (
            <div className="mt-6">
              {restTasks.map((task, index) => (
                <UnifiedPriorityRow
                  key={task.id}
                  task={task}
                  rank={index + 2}
                  onStatusChanged={handleStatusChanged}
                />
              ))}
            </div>
          )}

          {!isLoading && metrics.firm_tasks_history.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowHistory((value) => !value)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showHistory ? 'Hide history' : 'Show history'}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2">
                  {metrics.firm_tasks_history.map((task) => (
                    <div key={task.id} className="rounded-md border border-border px-3 py-2">
                      <p className="text-sm font-medium text-text">{task.name}</p>
                      {descriptionSnippet(task.description) && (
                        <p className="text-sm text-text-secondary">
                          {descriptionSnippet(task.description)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
