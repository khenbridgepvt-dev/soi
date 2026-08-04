'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { StaffDashboardPayload, StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import { queryKeys } from '@/lib/query/keys';

type ApiError = {
  error?: { message?: string };
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

function PriorityRow({
  task,
  rank,
  prominent = false,
}: {
  task: StaffDashboardTask;
  rank: number;
  prominent?: boolean;
}) {
  const schedule = formatSchedule(task);
  const clientLine = task.dependant_summary
    ? `${task.client_name} ${task.dependant_summary}`
    : task.client_name;

  if (prominent) {
    return (
      <div
        className={`rounded-md border border-border bg-surface p-4 ${statusBarClass(task)} border-l-4`}
        data-testid={`next-action-${task.id}`}
      >
        <p className="text-sm font-semibold text-text">
          {task.abbreviation} · {task.case_reference ?? 'No reference'}
        </p>
        <p className="mt-1 text-sm text-text">
          {clientLine} · {statusLabel(task)}
        </p>
        {schedule && (
          <p className="mt-1 text-xs font-medium text-text-secondary tabular-nums">
            {schedule}
          </p>
        )}
        <div className="mt-3">
          <Link
            href={`/staff/cases/${task.case_id}?task=${task.id}`}
            className="inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Open Case
          </Link>
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
        <Link
          href={`/staff/cases/${task.case_id}?task=${task.id}`}
          className="text-sm font-medium text-text hover:text-primary"
        >
          {task.abbreviation} · {task.case_reference ?? 'No reference'}
        </Link>
        <p className="text-sm text-text-secondary">
          {clientLine} · {statusLabel(task)}
        </p>
        {schedule && (
          <p className="text-xs text-text-muted tabular-nums">{schedule}</p>
        )}
      </div>
    </div>
  );
}

export default function StaffDashboardView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboard.staff('today'),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/staff?view=today');
      const json = (await response.json()) as { data?: StaffDashboardPayload } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load dashboard.');
      }

      return json.data ?? {
        today_task_count: 0,
        overdue_count: 0,
        blocked_count: 0,
        due_this_week_count: 0,
        priority_list: [],
      };
    },
  });

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
  };

  const [nextAction, ...rest] = metrics.priority_list;

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

          {!isLoading && nextAction && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Next action
              </p>
              <PriorityRow task={nextAction} rank={1} prominent />
            </div>
          )}

          {!isLoading && rest.length > 0 && (
            <div className="mt-6">
              {rest.map((task, index) => (
                <PriorityRow key={task.id} task={task} rank={index + 2} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
