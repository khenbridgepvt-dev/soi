import { isValidISODate } from '@/lib/utils/dates';

export type StaffPrioritySortInput = {
  id: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  is_urgent: boolean;
  is_overdue: boolean;
  last_date: string | null;
  current_assignment: {
    date: string;
    start_time: string;
    end_time: string;
  } | null;
  blocked_at: string | null;
};

function isUrgentActive(task: StaffPrioritySortInput): boolean {
  return (
    task.is_urgent &&
    task.status !== 'completed' &&
    task.status !== 'blocked'
  );
}

function scheduleSortKey(task: StaffPrioritySortInput, _today: string): string {
  if (task.current_assignment) {
    const { date, start_time } = task.current_assignment;
    const normalizedTime = start_time.length >= 5 ? start_time.slice(0, 5) : start_time;
    return `${date}T${normalizedTime}:00`;
  }

  if (task.is_overdue) {
    if (task.last_date && isValidISODate(task.last_date)) {
      return `${task.last_date}T00:00:00`;
    }

    return `0000-01-01T00:00:00`;
  }

  if (task.last_date && isValidISODate(task.last_date)) {
    return `${task.last_date}T23:59:59`;
  }

  return `9999-12-31T99:99:99`;
}

export function compareStaffPriorityTasks(
  left: StaffPrioritySortInput,
  right: StaffPrioritySortInput,
  today: string,
): number {
  const leftUrgent = isUrgentActive(left);
  const rightUrgent = isUrgentActive(right);

  if (leftUrgent !== rightUrgent) {
    return leftUrgent ? -1 : 1;
  }

  const timeDiff = scheduleSortKey(left, today).localeCompare(scheduleSortKey(right, today));
  if (timeDiff !== 0) {
    return timeDiff;
  }

  return left.id.localeCompare(right.id);
}

/** Urgent active tasks first, then scheduled time ascending (ticket 0048). */
export function sortStaffPriorityList<T extends StaffPrioritySortInput>(
  tasks: T[],
  today: string,
): T[] {
  return [...tasks].sort((left, right) => compareStaffPriorityTasks(left, right, today));
}

export function assignStaffPriorityRanks<T extends StaffPrioritySortInput>(
  tasks: T[],
  today: string,
): Array<T & { priority_rank: number }> {
  return sortStaffPriorityList(tasks, today).map((task, index) => ({
    ...task,
    priority_rank: index + 1,
  }));
}
