import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import { formatCompletedAt } from '@/lib/tasks/firm-tasks';

export type MyTasksFilter =
  | 'all_active'
  | 'today'
  | 'overdue'
  | 'not_started'
  | 'in_progress'
  | 'done';

export const MY_TASKS_DEFAULT_FILTER: MyTasksFilter = 'all_active';

export const MY_TASKS_PAGE_SUBTITLE = 'Tasks assigned to you';

export const MY_TASKS_CALENDAR_CTA = 'View my calendar';

export const MY_TASKS_SEARCH_LABEL = 'Search tasks';

export const MY_TASKS_EMPTY_ACTIVE =
  "No tasks waiting. You're all caught up.";

export const MY_TASKS_EMPTY_ACTIVE_LINK = 'View my calendar';

export const MY_TASKS_EMPTY_DONE = 'No completed tasks yet.';

export const MY_TASKS_OVERDUE_HELPER = 'This task is overdue';

export const MY_TASKS_COMPLETE_TOAST = 'Task marked done';

export const MY_TASKS_UNDO_LABEL = 'Undo';

export const MY_TASKS_START_LABEL = 'Start';

export const MY_TASKS_MARK_COMPLETE_LABEL = 'Mark complete';

export const MY_TASKS_STARTING_LABEL = 'Starting…';

export const MY_TASKS_COMPLETING_LABEL = 'Completing…';

export const MY_TASKS_SHOW_OVERDUE_ACTION = 'Show overdue';

export type TaskStatusChipVariant =
  | 'not_started'
  | 'in_progress'
  | 'done'
  | 'overdue'
  | 'blocked';

export const MY_TASKS_FILTER_OPTIONS: { id: MyTasksFilter; label: string }[] = [
  { id: 'all_active', label: 'All active' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'not_started', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export function formatOverdueBannerMessage(count: number): string {
  if (count === 1) {
    return '1 overdue task needs attention now';
  }

  return `${count} overdue tasks need attention now`;
}

export function formatWasScheduled(startTime: string, endTime: string): string {
  const start = startTime.slice(0, 5);
  const end = endTime.slice(0, 5);
  return `Was ${start}–${end}`;
}

export function formatDoneOnDate(completedAt: string | null | undefined): string | null {
  const formatted = formatCompletedAt(completedAt);
  return formatted ? `Done on ${formatted}` : null;
}

export function taskMatchesSearch(
  task: Pick<StaffDashboardTask, 'name' | 'description'>,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (task.name.toLowerCase().includes(normalized)) {
    return true;
  }

  return (task.description?.toLowerCase().includes(normalized) ?? false);
}

export function isTaskOverdueForDisplay(
  task: Pick<StaffDashboardTask, 'is_overdue' | 'status'>,
): boolean {
  return task.is_overdue && task.status !== 'completed';
}

export function getTaskStatusChipVariants(
  task: Pick<StaffDashboardTask, 'status' | 'is_overdue'>,
): TaskStatusChipVariant[] {
  const chips: TaskStatusChipVariant[] = [];

  if (isTaskOverdueForDisplay(task)) {
    chips.push('overdue');
  }

  if (task.status === 'not_started') {
    chips.push('not_started');
  } else if (task.status === 'in_progress') {
    chips.push('in_progress');
  } else if (task.status === 'completed') {
    chips.push('done');
  } else if (task.status === 'blocked') {
    chips.push('blocked');
  }

  return chips;
}

export function getTaskStatusChipLabel(variant: TaskStatusChipVariant): string {
  switch (variant) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'done':
      return 'Done';
    case 'overdue':
      return 'Overdue';
    case 'blocked':
      return 'Blocked';
  }
}

export function filterMyTasksByView(
  activeTasks: StaffDashboardTask[],
  completedTasks: StaffDashboardTask[],
  filter: MyTasksFilter,
  today: string,
): StaffDashboardTask[] {
  if (filter === 'done') {
    return completedTasks;
  }

  switch (filter) {
    case 'all_active':
      return activeTasks.filter(
        (task) => task.status === 'not_started' || task.status === 'in_progress',
      );
    case 'today':
      return activeTasks.filter((task) => task.current_assignment?.date === today);
    case 'overdue':
      return activeTasks.filter((task) => isTaskOverdueForDisplay(task));
    case 'not_started':
    case 'in_progress':
      return activeTasks.filter((task) => task.status === filter);
    default:
      return activeTasks;
  }
}

export function sortMyTasksWithOverdueFirst(tasks: StaffDashboardTask[]): StaffDashboardTask[] {
  return [...tasks].sort((left, right) => {
    const leftOverdue = isTaskOverdueForDisplay(left) ? 1 : 0;
    const rightOverdue = isTaskOverdueForDisplay(right) ? 1 : 0;

    if (rightOverdue !== leftOverdue) {
      return rightOverdue - leftOverdue;
    }

    return left.priority_rank - right.priority_rank;
  });
}

export function applyMyTasksListFilters(
  activeTasks: StaffDashboardTask[],
  completedTasks: StaffDashboardTask[],
  filter: MyTasksFilter,
  today: string,
  searchQuery: string,
): StaffDashboardTask[] {
  const filtered = filterMyTasksByView(activeTasks, completedTasks, filter, today);
  const searched = filtered.filter((task) => taskMatchesSearch(task, searchQuery));

  if (filter === 'done') {
    return searched;
  }

  return sortMyTasksWithOverdueFirst(searched);
}
