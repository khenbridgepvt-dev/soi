'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import TaskActionStrip from '@/components/staff/TaskActionStrip';
import type { StaffDashboardPayload, StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import type { StaffDashboardHistoryPayload } from '@/lib/dashboard/fetch-staff-dashboard-history';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import { refetchActiveTaskViewQueries } from '@/lib/query/refetch-views';
import { useTasksRealtime } from '@/lib/hooks/use-tasks-realtime';
import { queryKeys } from '@/lib/query/keys';
import {
  countFirmTasksOverdue,
  countFirmTasksToday,
  descriptionSnippet,
  filterFirmTasksByTab,
  firmTaskStatusBarClass,
  formatCompletedAt,
  formatFirmTaskSchedule,
  type FirmTasksTab,
} from '@/lib/tasks/firm-tasks';
import { todayISODate } from '@/lib/utils/dates';

type ApiError = {
  error?: { message?: string };
};

const TABS: { id: FirmTasksTab; label: string }[] = [
  { id: 'not_started', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

function SummaryMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger';
}) {
  const valueClass = tone === 'danger' ? 'text-error' : 'text-text';

  return (
    <div className="flex-1 px-4 py-3 text-center">
      <p className={`text-2xl font-semibold leading-tight tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

function FirmTaskRow({
  task,
  onStatusChanged,
}: {
  task: StaffDashboardTask;
  onStatusChanged: () => void;
}) {
  const schedule = formatFirmTaskSchedule(task);
  const snippet = descriptionSnippet(task.description);

  return (
    <div
      className={`rounded-md border-[1.5px] p-4 ${firmTaskStatusBarClass(task)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{task.name}</p>
          {snippet && <p className="mt-1 text-sm text-text-secondary">{snippet}</p>}
          {schedule && (
            <p className="mt-1 text-xs font-medium text-text-secondary tabular-nums">{schedule}</p>
          )}
          {task.status === 'completed' && formatCompletedAt(task.completed_at) && (
            <p className="mt-1 text-xs text-text-muted">
              Completed {formatCompletedAt(task.completed_at)}
            </p>
          )}
        </div>
        <TaskActionStrip task={task} onStatusChanged={onStatusChanged} showOpenCase={false} />
      </div>
    </div>
  );
}

type MyTasksViewProps = {
  userId: string;
  role: 'staff' | 'senior';
};

export default function MyTasksView({ userId, role }: MyTasksViewProps) {
  useTasksRealtime({ userId, role });

  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterMutation();
  const today = todayISODate();
  const [activeTab, setActiveTab] = useState<FirmTasksTab>('not_started');
  const [historyItems, setHistoryItems] = useState<StaffDashboardTask[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.staffTasks.dashboard(),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/staff?view=today');
      const json = (await response.json()) as { data?: StaffDashboardPayload } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load tasks.');
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

  const firmTasks = useMemo(() => data?.firm_tasks ?? [], [data?.firm_tasks]);
  const todayCount = countFirmTasksToday(firmTasks, today);
  const overdueCount = countFirmTasksOverdue(firmTasks);

  const visibleTasks = useMemo(
    () => filterFirmTasksByTab(firmTasks, historyItems, activeTab),
    [activeTab, firmTasks, historyItems],
  );

  async function loadHistory(cursor?: string | null, replace = false) {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const params = new URLSearchParams({ limit: '10', internalOnly: 'true' });
      if (cursor) {
        params.set('cursor', cursor);
      }

      const response = await fetch(`/api/dashboard/staff/history?${params.toString()}`);
      const json = (await response.json()) as { data?: StaffDashboardHistoryPayload } & ApiError;

      if (!response.ok) {
        setHistoryError(json.error?.message ?? 'Failed to load completed tasks.');
        return;
      }

      const page = json.data ?? { items: [], next_cursor: null, has_more: false };
      setHistoryItems((current) => (replace ? page.items : [...current, ...page.items]));
      setHistoryCursor(page.next_cursor);
      setHistoryHasMore(page.has_more);
    } catch {
      setHistoryError('Failed to load completed tasks.');
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'done' || historyItems.length > 0) {
      return;
    }

    void loadHistory(null, true);
  }, [activeTab, historyItems.length]);

  async function handleStatusChanged() {
    await invalidate('taskStatus');
    await refetchActiveTaskViewQueries(queryClient);
    setHistoryItems([]);
    setHistoryCursor(null);
    setHistoryHasMore(false);
    if (activeTab === 'done') {
      void loadHistory(null, true);
    }
  }

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">My tasks</h1>
          <Link href="/staff/calendar" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
            My calendar →
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {errorMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-2 divide-x divide-border">
          <SummaryMetric label="Today" value={isLoading ? 0 : todayCount} />
          <SummaryMetric
            label="Overdue"
            value={isLoading ? 0 : overdueCount}
            tone={overdueCount > 0 ? 'danger' : 'default'}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'border border-border bg-surface text-text-secondary hover:bg-page'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-md bg-page" />
            <div className="h-20 animate-pulse rounded-md bg-page" />
          </div>
        )}

        {!isLoading && historyError && activeTab === 'done' && (
          <p className="text-sm text-error">{historyError}</p>
        )}

        {!isLoading && visibleTasks.length === 0 && !historyLoading && (
          <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-secondary">
            {activeTab === 'done'
              ? 'No completed tasks yet.'
              : 'No tasks waiting — check My calendar or ask your manager.'}
          </p>
        )}

        {!isLoading &&
          visibleTasks.map((task) => (
            <FirmTaskRow key={task.id} task={task} onStatusChanged={handleStatusChanged} />
          ))}

        {activeTab === 'done' && historyLoading && (
          <p className="text-sm text-text-secondary">Loading…</p>
        )}

        {activeTab === 'done' && historyHasMore && !historyLoading && (
          <button
            type="button"
            onClick={() => loadHistory(historyCursor)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Load more
          </button>
        )}
      </section>
    </div>
  );
}
