'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import TaskActionStrip from '@/components/staff/TaskActionStrip';
import TaskStatusChip from '@/components/staff/TaskStatusChip';
import Toast from '@/components/ui/Toast';
import type { StaffDashboardPayload, StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import type { StaffDashboardHistoryPayload } from '@/lib/dashboard/fetch-staff-dashboard-history';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import { refetchActiveTaskViewQueries } from '@/lib/query/refetch-views';
import { useScheduleRealtime } from '@/lib/hooks/use-schedule-realtime';
import { useTasksRealtime } from '@/lib/hooks/use-tasks-realtime';
import { queryKeys, SCHEDULE_REFETCH_INTERVAL_MS } from '@/lib/query/keys';
import {
  descriptionSnippet,
  firmTaskStatusBarClass,
  formatFirmTaskSchedule,
} from '@/lib/tasks/firm-tasks';
import {
  applyMyTasksListFilters,
  formatDoneOnDate,
  formatOverdueBannerMessage,
  formatWasScheduled,
  getTaskStatusChipVariants,
  MY_TASKS_CALENDAR_CTA,
  MY_TASKS_COMPLETE_TOAST,
  MY_TASKS_DEFAULT_FILTER,
  MY_TASKS_EMPTY_ACTIVE,
  MY_TASKS_EMPTY_ACTIVE_LINK,
  MY_TASKS_EMPTY_DONE,
  MY_TASKS_FILTER_OPTIONS,
  MY_TASKS_OVERDUE_HELPER,
  MY_TASKS_PAGE_SUBTITLE,
  MY_TASKS_SEARCH_LABEL,
  MY_TASKS_SHOW_OVERDUE_ACTION,
  MY_TASKS_UNDO_LABEL,
  type MyTasksFilter,
} from '@/lib/tasks/firm-tasks-ui';
import { todayISODate } from '@/lib/utils/dates';

type ApiError = {
  error?: { message?: string };
};

type UndoState = {
  taskId: string;
  previousStatus: 'not_started' | 'in_progress';
};

function SummaryMetricButton({
  label,
  value,
  tone = 'default',
  pressed = false,
  onClick,
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger';
  pressed?: boolean;
  onClick: () => void;
}) {
  const valueClass = tone === 'danger' ? 'text-error' : 'text-text';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex-1 px-4 py-3 text-center transition-colors hover:bg-page ${
        pressed ? 'bg-page' : ''
      }`}
    >
      <p className={`text-2xl font-semibold leading-tight tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </button>
  );
}

function ActiveTaskRow({
  task,
  onStatusChanged,
  onCompleted,
}: {
  task: StaffDashboardTask;
  onStatusChanged: () => void;
  onCompleted: (taskId: string, previousStatus: 'not_started' | 'in_progress') => void;
}) {
  const schedule = formatFirmTaskSchedule(task);
  const snippet = descriptionSnippet(task.description);
  const chips = getTaskStatusChipVariants(task);
  const showOverdueHelper = task.is_overdue && task.status !== 'completed';

  return (
    <div className={`rounded-md border-[1.5px] p-4 ${firmTaskStatusBarClass(task)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((variant) => (
              <TaskStatusChip key={variant} variant={variant} />
            ))}
          </div>
          <p className="mt-2 text-sm font-semibold text-text">{task.name}</p>
          {snippet && <p className="mt-1 text-sm text-text-secondary">{snippet}</p>}
          {showOverdueHelper && (
            <p className="mt-1 text-xs font-medium text-error">{MY_TASKS_OVERDUE_HELPER}</p>
          )}
          {schedule && (
            <p className="mt-1 text-xs font-medium text-text-secondary tabular-nums">{schedule}</p>
          )}
        </div>
        <TaskActionStrip
          task={task}
          onStatusChanged={onStatusChanged}
          onCompleted={onCompleted}
          showOpenCase={!task.case_is_internal}
        />
      </div>
    </div>
  );
}

function DoneTaskRow({ task }: { task: StaffDashboardTask }) {
  const wasScheduled = task.current_assignment
    ? formatWasScheduled(
        task.current_assignment.start_time,
        task.current_assignment.end_time,
      )
    : null;
  const doneOn = formatDoneOnDate(task.completed_at);
  const meta = [wasScheduled, doneOn].filter(Boolean).join(' · ');

  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <TaskStatusChip variant="done" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
          {task.name}
          {meta ? <span className="font-normal text-text-secondary"> · {meta}</span> : null}
        </p>
      </div>
    </div>
  );
}

type MyTasksViewProps = {
  userId: string;
  role: 'staff' | 'senior';
};

export default function MyTasksView({ userId, role }: MyTasksViewProps) {
  const today = todayISODate();

  useTasksRealtime({ userId, role });
  useScheduleRealtime({
    viewedDate: today,
    userId,
    role,
    ignoreViewedDate: true,
  });

  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterMutation();
  const [listFilter, setListFilter] = useState<MyTasksFilter>(MY_TASKS_DEFAULT_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyItems, setHistoryItems] = useState<StaffDashboardTask[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

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
    refetchOnWindowFocus: true,
    refetchInterval: SCHEDULE_REFETCH_INTERVAL_MS,
  });

  const firmTasks = useMemo(() => data?.firm_tasks ?? [], [data?.firm_tasks]);
  const todayCount = useMemo(
    () => firmTasks.filter((task) => task.current_assignment?.date === today).length,
    [firmTasks, today],
  );
  const overdueCount = useMemo(
    () => firmTasks.filter((task) => task.is_overdue && task.status !== 'completed').length,
    [firmTasks],
  );

  const visibleTasks = useMemo(
    () => applyMyTasksListFilters(firmTasks, historyItems, listFilter, today, searchQuery),
    [firmTasks, historyItems, listFilter, searchQuery, today],
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
    if (listFilter !== 'done' || historyItems.length > 0) {
      return;
    }

    void loadHistory(null, true);
  }, [listFilter, historyItems.length]);

  async function handleStatusChanged() {
    await invalidate('taskStatus');
    await refetchActiveTaskViewQueries(queryClient);
    setHistoryItems([]);
    setHistoryCursor(null);
    setHistoryHasMore(false);
    if (listFilter === 'done') {
      void loadHistory(null, true);
    }
  }

  function handleTaskCompleted(
    taskId: string,
    previousStatus: 'not_started' | 'in_progress',
  ) {
    setUndoState({ taskId, previousStatus });
    setToastMessage(MY_TASKS_COMPLETE_TOAST);
    setUndoError(null);
  }

  async function handleUndoComplete() {
    if (!undoState) {
      return;
    }

    setUndoError(null);

    try {
      const response = await fetch(`/api/tasks/${undoState.taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: undoState.previousStatus }),
      });

      const json = (await response.json()) as ApiError;
      if (!response.ok) {
        setUndoError(json.error?.message ?? 'Failed to undo.');
        return;
      }

      setToastMessage(null);
      setUndoState(null);
      await handleStatusChanged();
    } catch {
      setUndoError('Failed to undo.');
    }
  }

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  const showEmptyActive =
    !isLoading &&
    listFilter !== 'done' &&
    visibleTasks.length === 0 &&
    !searchQuery.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">My tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">{MY_TASKS_PAGE_SUBTITLE}</p>
        </div>
        <Link
          href="/staff/calendar"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-page"
        >
          {MY_TASKS_CALENDAR_CTA}
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {errorMessage}
        </div>
      )}

      {undoError && (
        <div className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {undoError}
        </div>
      )}

      {!isLoading && overdueCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error bg-error-bg px-4 py-3 text-sm text-error">
          <p>{formatOverdueBannerMessage(overdueCount)}</p>
          <button
            type="button"
            onClick={() => setListFilter('overdue')}
            className="rounded-md border border-error bg-surface px-3 py-1.5 text-sm font-medium text-error hover:bg-page"
          >
            {MY_TASKS_SHOW_OVERDUE_ACTION}
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-2 divide-x divide-border">
          <SummaryMetricButton
            label="Today"
            value={isLoading ? 0 : todayCount}
            pressed={listFilter === 'today'}
            onClick={() => setListFilter('today')}
          />
          <SummaryMetricButton
            label="Overdue"
            value={isLoading ? 0 : overdueCount}
            tone={overdueCount > 0 ? 'danger' : 'default'}
            pressed={listFilter === 'overdue'}
            onClick={() => setListFilter('overdue')}
          />
        </div>
      </section>

      <div>
        <label className="mb-1 block text-sm font-medium text-text" htmlFor="my-tasks-search">
          {MY_TASKS_SEARCH_LABEL}
        </label>
        <input
          id="my-tasks-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by task name or notes"
          className="min-h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {MY_TASKS_FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setListFilter(filter.id)}
            className={`min-h-[36px] rounded-full px-4 py-2 text-sm font-medium ${
              listFilter === filter.id
                ? 'bg-primary text-white'
                : 'border border-border bg-surface text-text-secondary hover:bg-page'
            }`}
            aria-pressed={listFilter === filter.id}
          >
            {filter.label}
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

        {!isLoading && historyError && listFilter === 'done' && (
          <p className="text-sm text-error">{historyError}</p>
        )}

        {showEmptyActive && (
          <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-secondary">
            <p>{MY_TASKS_EMPTY_ACTIVE}</p>
            <Link href="/staff/calendar" className="mt-2 inline-block font-medium text-primary hover:underline">
              {MY_TASKS_EMPTY_ACTIVE_LINK}
            </Link>
          </div>
        )}

        {!isLoading && !showEmptyActive && visibleTasks.length === 0 && !historyLoading && (
          <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-secondary">
            {listFilter === 'done' ? MY_TASKS_EMPTY_DONE : 'No tasks match your search.'}
          </p>
        )}

        {!isLoading &&
          visibleTasks.map((task) =>
            listFilter === 'done' || task.status === 'completed' ? (
              <DoneTaskRow key={task.id} task={task} />
            ) : (
              <ActiveTaskRow
                key={task.id}
                task={task}
                onStatusChanged={handleStatusChanged}
                onCompleted={handleTaskCompleted}
              />
            ),
          )}

        {listFilter === 'done' && historyLoading && (
          <p className="text-sm text-text-secondary">Loading…</p>
        )}

        {listFilter === 'done' && historyHasMore && !historyLoading && (
          <button
            type="button"
            onClick={() => loadHistory(historyCursor)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Load more
          </button>
        )}
      </section>

      <Toast
        message={toastMessage}
        durationMs={8000}
        actionLabel={undoState ? MY_TASKS_UNDO_LABEL : undefined}
        onAction={undoState ? handleUndoComplete : undefined}
        onDismiss={() => {
          setToastMessage(null);
          setUndoState(null);
        }}
      />
    </div>
  );
}
