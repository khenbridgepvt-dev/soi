import type { TaskBoardStatusToken } from '@/lib/task-board/card-token';

export type BoardFilterMode = 'all' | 'urgent' | 'blocked' | 'by_type';

export type BoardFilter =
  | { mode: 'all' }
  | { mode: 'urgent' }
  | { mode: 'blocked' }
  | { mode: 'by_type'; applicationTypeCode: string };

export type BoardFilterableTask = {
  status: string;
  isCaseUrgent: boolean;
  applicationTypeCode: string;
  token: TaskBoardStatusToken;
};

export function parseBoardFilter(
  mode: string | null,
  applicationTypeCode: string | null,
): BoardFilter {
  if (mode === 'urgent') {
    return { mode: 'urgent' };
  }

  if (mode === 'blocked') {
    return { mode: 'blocked' };
  }

  if (mode === 'by_type' && applicationTypeCode) {
    return { mode: 'by_type', applicationTypeCode };
  }

  return { mode: 'all' };
}

export function matchesBoardFilter(
  task: BoardFilterableTask,
  filter: BoardFilter,
): boolean {
  switch (filter.mode) {
    case 'all':
      return true;
    case 'urgent':
      return task.token === 'urgent' || task.isCaseUrgent;
    case 'blocked':
      return task.status === 'blocked' || task.token === 'blocked';
    case 'by_type':
      return task.applicationTypeCode === filter.applicationTypeCode;
    default:
      return true;
  }
}

export function filterBoardTasks<T extends BoardFilterableTask>(
  tasks: T[],
  filter: BoardFilter,
): T[] {
  return tasks.filter((task) => matchesBoardFilter(task, filter));
}
