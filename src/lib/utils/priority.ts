import { isValidISODate } from '@/lib/utils/dates';

export type PriorityBucket = 'urgent' | 'overdue' | 'approaching' | 'on_track' | 'blocked';

export type PrioritySortInput = {
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

const BUCKET_ORDER: Record<PriorityBucket, number> = {
  urgent: 0,
  overdue: 1,
  approaching: 2,
  on_track: 3,
  blocked: 4,
};

function calendarDaysUntil(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function isApproachingDeadline(lastDate: string | null, today: string): boolean {
  if (!lastDate || !isValidISODate(lastDate)) {
    return false;
  }

  const remaining = calendarDaysUntil(today, lastDate);
  return remaining >= 0 && remaining <= 3;
}

function deadlineSortKey(task: PrioritySortInput): number {
  if (task.last_date && isValidISODate(task.last_date)) {
    return new Date(`${task.last_date}T00:00:00Z`).getTime();
  }

  if (task.current_assignment?.date) {
    return new Date(`${task.current_assignment.date}T00:00:00Z`).getTime();
  }

  return Number.POSITIVE_INFINITY;
}

function overdueSortKey(task: PrioritySortInput, today: string): number {
  if (task.last_date && isValidISODate(task.last_date)) {
    return calendarDaysUntil(task.last_date, today);
  }

  if (task.current_assignment?.date && task.current_assignment.date < today) {
    return calendarDaysUntil(task.current_assignment.date, today);
  }

  return 0;
}

function startTimeSortKey(task: PrioritySortInput, today: string): number {
  if (task.current_assignment?.date === today) {
    const [hour, minute] = task.current_assignment.start_time.split(':').map(Number);
    return hour * 60 + minute;
  }

  return Number.POSITIVE_INFINITY;
}

export function classifyPriorityBucket(
  task: PrioritySortInput,
  today: string,
): PriorityBucket {
  if (task.status === 'blocked') {
    return 'blocked';
  }

  if (task.is_urgent && task.status !== 'completed') {
    return 'urgent';
  }

  if (task.is_overdue) {
    return 'overdue';
  }

  if (isApproachingDeadline(task.last_date, today)) {
    return 'approaching';
  }

  return 'on_track';
}

export function comparePriorityTasks(
  left: PrioritySortInput,
  right: PrioritySortInput,
  today: string,
): number {
  const leftBucket = classifyPriorityBucket(left, today);
  const rightBucket = classifyPriorityBucket(right, today);
  const bucketDiff = BUCKET_ORDER[leftBucket] - BUCKET_ORDER[rightBucket];

  if (bucketDiff !== 0) {
    return bucketDiff;
  }

  if (leftBucket === 'urgent' || leftBucket === 'approaching') {
    const deadlineDiff = deadlineSortKey(left) - deadlineSortKey(right);
    if (deadlineDiff !== 0) {
      return deadlineDiff;
    }
  }

  if (leftBucket === 'overdue') {
    const overdueDiff = overdueSortKey(right, today) - overdueSortKey(left, today);
    if (overdueDiff !== 0) {
      return overdueDiff;
    }
  }

  if (leftBucket === 'on_track') {
    const timeDiff = startTimeSortKey(left, today) - startTimeSortKey(right, today);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    const deadlineDiff = deadlineSortKey(left) - deadlineSortKey(right);
    if (deadlineDiff !== 0) {
      return deadlineDiff;
    }
  }

  if (leftBucket === 'blocked') {
    const leftBlocked = left.blocked_at ? new Date(left.blocked_at).getTime() : 0;
    const rightBlocked = right.blocked_at ? new Date(right.blocked_at).getTime() : 0;
    const blockedDiff = rightBlocked - leftBlocked;
    if (blockedDiff !== 0) {
      return blockedDiff;
    }
  }

  return left.id.localeCompare(right.id);
}

export function sortByPriority<T extends PrioritySortInput>(
  tasks: T[],
  today: string,
): T[] {
  return [...tasks].sort((left, right) => comparePriorityTasks(left, right, today));
}

export function assignPriorityRanks<T extends PrioritySortInput>(
  tasks: T[],
  today: string,
): Array<T & { priority_rank: number }> {
  return sortByPriority(tasks, today).map((task, index) => ({
    ...task,
    priority_rank: index + 1,
  }));
}
