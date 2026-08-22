import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import {
  teamTaskStatusListRowClasses,
} from '@/lib/tasks/team-task-status-colour';
import { todayISODate } from '@/lib/utils/dates';

export type FirmTasksTab = 'not_started' | 'in_progress' | 'done';

export function filterFirmTasksByTab(
  activeTasks: StaffDashboardTask[],
  completedTasks: StaffDashboardTask[],
  tab: FirmTasksTab,
): StaffDashboardTask[] {
  if (tab === 'done') {
    return completedTasks;
  }

  return activeTasks.filter((task) => task.status === tab);
}

export function countFirmTasksToday(tasks: StaffDashboardTask[], today: string): number {
  return tasks.filter((task) => task.current_assignment?.date === today).length;
}

export function countFirmTasksOverdue(tasks: StaffDashboardTask[]): number {
  return tasks.filter((task) => task.is_overdue && task.status !== 'completed').length;
}

/** Status-first row styling — shared with schedule calendar (ADR-0023, ticket 0096). */
export function firmTaskStatusBarClass(
  task: StaffDashboardTask,
  today: string = todayISODate(),
  now?: Date,
): string {
  return teamTaskStatusListRowClasses({
    task_status: task.status,
    is_overdue: task.is_overdue,
    assignmentDate: task.current_assignment?.date ?? null,
    end_time: task.current_assignment?.end_time ?? null,
    viewedDate: task.current_assignment?.date ?? today,
    now,
  });
}

export function formatFirmTaskSchedule(
  task: StaffDashboardTask,
  todayLabel = 'today',
): string | null {
  if (!task.current_assignment) {
    return null;
  }

  const { date, start_time: start, end_time: end } = task.current_assignment;
  const startLabel = start.slice(0, 5);
  const endLabel = end.slice(0, 5);
  const dayLabel = task.is_today ? todayLabel : date;

  return `${startLabel}–${endLabel} ${dayLabel}`;
}

export function descriptionSnippet(description: string | null | undefined, max = 80): string | null {
  const value = description?.trim();
  if (!value) {
    return null;
  }

  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function formatCompletedAt(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
