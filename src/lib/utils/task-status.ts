import type { Database } from '@/types/database';

export type TaskStatus = Database['public']['Enums']['task_status'];

const ALLOWED_TARGETS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ['in_progress', 'completed'],
  in_progress: ['completed'],
  blocked: [],
  completed: [],
};

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) {
    return true;
  }

  return ALLOWED_TARGETS[from]?.includes(to) ?? false;
}

export function getTransitionError(from: TaskStatus, to: TaskStatus): string {
  if (from === 'completed') {
    return 'Completed tasks cannot be reverted.';
  }

  if (from === 'not_started' && to === 'completed') {
    return 'This task cannot be completed from its current state.';
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
