import type { Database } from '@/types/database';

export type TaskStatus = Database['public']['Enums']['task_status'];

const ALLOWED_TARGETS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ['in_progress'],
  in_progress: ['completed'],
  blocked: [],
  completed: [],
};

export type TaskStatusTransitionOptions = {
  caseIsInternal?: boolean;
};

export function canTransitionTaskStatus(
  from: TaskStatus,
  to: TaskStatus,
  options: TaskStatusTransitionOptions = {},
): boolean {
  if (from === to) {
    return true;
  }

  if (options.caseIsInternal && from === 'not_started' && to === 'completed') {
    return true;
  }

  return ALLOWED_TARGETS[from]?.includes(to) ?? false;
}

export function getTransitionError(
  from: TaskStatus,
  to: TaskStatus,
  options: TaskStatusTransitionOptions = {},
): string {
  if (from === 'completed') {
    return 'Completed tasks cannot be reverted.';
  }

  if (from === 'not_started' && to === 'completed') {
    if (options.caseIsInternal) {
      return 'This firm task cannot be completed from its current state.';
    }

    return 'Task must be in progress before it can be completed.';
  }

  if (to === 'blocked') {
    return 'Use the block endpoint to mark a task as blocked.';
  }

  if (from === 'blocked') {
    return 'Use the unblock endpoint to resume a blocked task.';
  }

  return 'This status transition is not allowed.';
}

export const MVP_ALLOWED_STATUS_VALUES: TaskStatus[] = [
  'not_started',
  'in_progress',
  'completed',
];
