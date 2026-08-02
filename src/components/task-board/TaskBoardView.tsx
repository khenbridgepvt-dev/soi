'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CreateLeadModal from '@/components/cases/CreateLeadModal';
import TaskBoardCard from '@/components/task-board/TaskBoardCard';
import type { TaskBoardCard as TaskBoardCardData } from '@/lib/task-board/fetch-task-board';
import type { TaskBoardStaffColumn } from '@/lib/task-board/fetch-task-board';
import {
  filterBoardTasks,
  parseBoardFilter,
  type BoardFilter,
} from '@/lib/task-board/board-filters';

type TaskBoardPayload = {
  columns: TaskBoardStaffColumn[];
  unassigned_count: number;
  tasks: TaskBoardCardData[];
  application_types: Array<{ code: string; name: string }>;
};

type ApiError = {
  error?: { message?: string };
};

const UNASSIGNED_COLUMN_ID = '__unassigned__';

type ApplicationTypeOption = {
  id: string;
  name: string;
};

type TaskBoardViewProps = {
  initialFilter?: string;
  applicationTypes: ApplicationTypeOption[];
};

export default function TaskBoardView({
  initialFilter,
  applicationTypes,
}: TaskBoardViewProps) {
  const [payload, setPayload] = useState<TaskBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState(
    initialFilter === 'urgent' || initialFilter === 'blocked' ? initialFilter : 'all',
  );
  const [typeCode, setTypeCode] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [activeStaffTab, setActiveStaffTab] = useState<string | null>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/task-board');
      const json = (await response.json()) as { data?: TaskBoardPayload } & ApiError;

      if (!response.ok) {
        setError(json.error?.message ?? 'Failed to load task board.');
        setPayload(null);
        return;
      }

      setPayload(json.data ?? null);
    } catch {
      setError('Unable to connect. Check your internet connection.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const filter: BoardFilter = useMemo(
    () => parseBoardFilter(filterMode, typeCode || null),
    [filterMode, typeCode],
  );

  const filteredTasks = useMemo(() => {
    if (!payload) {
      return [];
    }

    return filterBoardTasks(
      payload.tasks.map((task) => ({
        ...task,
        isCaseUrgent: task.is_case_urgent,
        applicationTypeCode: task.application_type_code,
      })),
      filter,
    );
  }, [payload, filter]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, TaskBoardCardData[]>();

    for (const column of payload?.columns ?? []) {
      map.set(column.id, []);
    }

    map.set(UNASSIGNED_COLUMN_ID, []);

    for (const task of filteredTasks) {
      const key = task.assigned_to ?? UNASSIGNED_COLUMN_ID;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }

    return map;
  }, [filteredTasks, payload?.columns]);

  useEffect(() => {
    if (!payload || activeStaffTab) {
      return;
    }

    if (payload.columns.length > 0) {
      setActiveStaffTab(payload.columns[0].id);
    } else {
      setActiveStaffTab(UNASSIGNED_COLUMN_ID);
    }
  }, [payload, activeStaffTab]);

  const visibleColumnIds = useMemo(() => {
    const ids = (payload?.columns ?? []).map((column) => column.id);
    ids.push(UNASSIGNED_COLUMN_ID);
    return ids;
  }, [payload?.columns]);

  const isEmptyBoard = !loading && filteredTasks.length === 0;

  function renderColumn(columnId: string, title: string, count: number) {
    const tasks = tasksByColumn.get(columnId) ?? [];

    return (
      <section
        key={columnId}
        className="flex min-w-[240px] flex-1 flex-col rounded-lg border border-border bg-page"
        data-testid={`task-board-column-${columnId}`}
      >
        <header className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text">
            {title}
            <span className="ml-1 text-text-muted">({count})</span>
          </h2>
        </header>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {loading &&
            Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-md bg-border/60"
              />
            ))}
          {!loading && tasks.length === 0 && (
            <p className="px-1 py-4 text-center text-sm text-text-muted">No active tasks</p>
          )}
          {!loading &&
            tasks.map((task) => <TaskBoardCard key={task.id} task={task} />)}
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text">Task Board</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface p-1">
            {(['all', 'urgent', 'blocked'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setFilterMode(mode);
                  setTypeMenuOpen(false);
                }}
                className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                  filterMode === mode
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-page'
                }`}
              >
                {mode === 'all' ? 'All' : mode}
              </button>
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeMenuOpen((open) => !open)}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  filterMode === 'by_type'
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-page'
                }`}
              >
                By type ▾
              </button>
              {typeMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-md border border-border bg-surface py-1 shadow-sm">
                  {(payload?.application_types ?? []).map((type) => (
                    <button
                      key={type.code}
                      type="button"
                      onClick={() => {
                        setFilterMode('by_type');
                        setTypeCode(type.code);
                        setTypeMenuOpen(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-text hover:bg-page"
                    >
                      {type.name}
                    </button>
                  ))}
                  {(payload?.application_types ?? []).length === 0 && (
                    <p className="px-3 py-1.5 text-xs text-text-muted">No types</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateLeadOpen(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            + Create Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {isEmptyBoard && filter.mode === 'all' && (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-text-secondary">
            No active tasks. Create a case to get started.
          </p>
          <button
            type="button"
            onClick={() => setCreateLeadOpen(true)}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            + Create Lead
          </button>
        </div>
      )}

      {!(isEmptyBoard && filter.mode === 'all') && (
        <>
          <div className="mb-3 flex gap-1 overflow-x-auto md:hidden">
            {(payload?.columns ?? []).map((column) => (
              <button
                key={column.id}
                type="button"
                onClick={() => setActiveStaffTab(column.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  activeStaffTab === column.id
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-text-secondary'
                }`}
              >
                {column.full_name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveStaffTab(UNASSIGNED_COLUMN_ID)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                activeStaffTab === UNASSIGNED_COLUMN_ID
                  ? 'bg-primary text-white'
                  : 'border border-border bg-surface text-text-secondary'
              }`}
            >
              Unassigned
            </button>
          </div>

          <div className="hidden gap-3 overflow-x-auto md:flex">
            {(payload?.columns ?? []).map((column) =>
              renderColumn(column.id, column.full_name, column.active_task_count),
            )}
            {renderColumn(
              UNASSIGNED_COLUMN_ID,
              'Unassigned',
              payload?.unassigned_count ?? 0,
            )}
          </div>

          <div className="md:hidden">
            {activeStaffTab &&
              visibleColumnIds.includes(activeStaffTab) &&
              renderColumn(
                activeStaffTab,
                activeStaffTab === UNASSIGNED_COLUMN_ID
                  ? 'Unassigned'
                  : payload?.columns.find((column) => column.id === activeStaffTab)
                      ?.full_name ?? 'Staff',
                activeStaffTab === UNASSIGNED_COLUMN_ID
                  ? payload?.unassigned_count ?? 0
                  : payload?.columns.find((column) => column.id === activeStaffTab)
                      ?.active_task_count ?? 0,
              )}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Manual refresh —{' '}
        <button
          type="button"
          onClick={() => void loadBoard()}
          className="text-primary underline"
        >
          reload board
        </button>
        . Real-time updates arrive in Phase 2.
      </p>

      <CreateLeadModal
        open={createLeadOpen}
        applicationTypes={applicationTypes}
        onClose={() => setCreateLeadOpen(false)}
        onCreated={() => {
          setCreateLeadOpen(false);
          void loadBoard();
        }}
      />
    </div>
  );
}
