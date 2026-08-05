'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CreateLeadModal from '@/components/cases/CreateLeadModal';
import TaskBoardCard from '@/components/task-board/TaskBoardCard';
import type { TaskBoardCard as TaskBoardCardData } from '@/lib/task-board/fetch-task-board';
import type { TaskBoardStaffColumn } from '@/lib/task-board/fetch-task-board';
import {
  filterBoardTasks,
  parseBoardFilter,
  type BoardFilter,
} from '@/lib/task-board/board-filters';
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

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
  applicationTypes?: ApplicationTypeOption[];
};

async function fetchApplicationTypes(): Promise<ApplicationTypeOption[]> {
  const response = await fetch('/api/application-types?is_active=true');
  const json = (await response.json()) as { data?: ApplicationTypeOption[] } & ApiError;

  if (!response.ok) {
    throw new Error(json.error?.message ?? 'Failed to load application types.');
  }

  return json.data ?? [];
}

async function fetchTaskBoard(): Promise<TaskBoardPayload> {
  const response = await fetch('/api/task-board');
  const json = (await response.json()) as { data?: TaskBoardPayload } & ApiError;

  if (!response.ok || !json.data) {
    throw new Error(json.error?.message ?? 'Failed to load task board.');
  }

  return json.data;
}

export default function TaskBoardView({
  initialFilter,
  applicationTypes: applicationTypesProp,
}: TaskBoardViewProps) {
  const invalidate = useInvalidateAfterMutation();
  const [filterMode, setFilterMode] = useState(
    initialFilter === 'urgent' || initialFilter === 'blocked' ? initialFilter : 'all',
  );
  const [typeCode, setTypeCode] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [activeStaffTab, setActiveStaffTab] = useState<string | null>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const {
    data: payload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.taskBoard(),
    queryFn: fetchTaskBoard,
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const { data: applicationTypesQuery } = useQuery({
    queryKey: queryKeys.applicationTypes(),
    queryFn: fetchApplicationTypes,
    enabled: !applicationTypesProp,
  });

  const applicationTypes = applicationTypesProp ?? applicationTypesQuery ?? [];

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

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

    if (!payload) {
      return map;
    }

    for (const column of payload.columns) {
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
  }, [payload, filteredTasks]);

  const typeOptions = payload?.application_types ?? [];

  const staffColumns = payload?.columns ?? [];
  const mobileColumnId =
    activeStaffTab ?? staffColumns[0]?.id ?? UNASSIGNED_COLUMN_ID;

  function handleLeadCreated() {
    void invalidate('createLead');
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(['all', 'urgent', 'blocked'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filterMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-page text-text-secondary hover:bg-border'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'urgent' ? 'Urgent' : 'Blocked'}
            </button>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTypeMenuOpen((open) => !open)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filterMode === 'type'
                  ? 'bg-primary text-white'
                  : 'bg-page text-text-secondary hover:bg-border'
              }`}
            >
              By type{typeCode ? `: ${typeCode}` : ''}
            </button>
            {typeMenuOpen && (
              <ul
                className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-md border border-border bg-surface py-1 shadow-lg"
              >
                {typeOptions.map((type) => (
                  <li key={type.code}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-page"
                      onClick={() => {
                        setFilterMode('type');
                        setTypeCode(type.code);
                        setTypeMenuOpen(false);
                      }}
                    >
                      {type.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setCreateLeadOpen(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          + Create Lead
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-page"
        >
          Refresh
        </button>
      </div>

      {isLoading && <p className="text-sm text-text-muted">Loading task board…</p>}

      {!isLoading && staffColumns.length > 0 && (
        <div className="md:hidden">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {staffColumns.map((column) => (
              <button
                key={column.id}
                type="button"
                onClick={() => setActiveStaffTab(column.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  mobileColumnId === column.id
                    ? 'bg-primary text-white'
                    : 'bg-page text-text-secondary'
                }`}
              >
                {column.full_name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveStaffTab(UNASSIGNED_COLUMN_ID)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                mobileColumnId === UNASSIGNED_COLUMN_ID
                  ? 'bg-primary text-white'
                  : 'bg-page text-text-secondary'
              }`}
            >
              Unassigned
            </button>
          </div>
        </div>
      )}

      {!isLoading && payload && (
        <div className="hidden gap-4 md:grid md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {staffColumns.map((column) => (
            <section key={column.id} className="min-w-0">
              <header className="sticky top-0 z-10 border-b border-border bg-page px-2 py-2">
                <h2 className="text-sm font-semibold text-text">{column.full_name}</h2>
                <p className="text-xs text-text-muted">
                  {(tasksByColumn.get(column.id) ?? []).length} tasks
                </p>
              </header>
              <ul className="space-y-2 p-2">
                {(tasksByColumn.get(column.id) ?? []).map((task) => (
                  <li key={task.id}>
                    <TaskBoardCard task={task} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="min-w-0">
            <header className="sticky top-0 z-10 border-b border-border bg-page px-2 py-2">
              <h2 className="text-sm font-semibold text-text">Unassigned</h2>
              <p className="text-xs text-text-muted">
                {(tasksByColumn.get(UNASSIGNED_COLUMN_ID) ?? []).length} tasks
              </p>
            </header>
            <ul className="space-y-2 p-2">
              {(tasksByColumn.get(UNASSIGNED_COLUMN_ID) ?? []).map((task) => (
                <li key={task.id}>
                  <TaskBoardCard task={task} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {!isLoading && payload && (
        <div className="md:hidden">
          {mobileColumnId === UNASSIGNED_COLUMN_ID ? (
            <section>
              <header className="border-b border-border px-2 py-2">
                <h2 className="text-sm font-semibold">Unassigned</h2>
              </header>
              <ul className="space-y-2 p-2">
                {(tasksByColumn.get(UNASSIGNED_COLUMN_ID) ?? []).map((task) => (
                  <li key={task.id}>
                    <TaskBoardCard task={task} />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            staffColumns
              .filter((col) => col.id === mobileColumnId)
              .map((column) => (
                <section key={column.id}>
                  <header className="border-b border-border px-2 py-2">
                    <h2 className="text-sm font-semibold">{column.full_name}</h2>
                  </header>
                  <ul className="space-y-2 p-2">
                    {(tasksByColumn.get(column.id) ?? []).map((task) => (
                      <li key={task.id}>
                        <TaskBoardCard task={task} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
          )}
        </div>
      )}

      <CreateLeadModal
        open={createLeadOpen}
        applicationTypes={applicationTypes}
        onClose={() => setCreateLeadOpen(false)}
        onCreated={() => {
          setCreateLeadOpen(false);
          handleLeadCreated();
        }}
      />
    </div>
  );
}
