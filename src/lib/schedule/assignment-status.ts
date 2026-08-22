/** Shared schedule pill status labels (S-04, S-11) — design_system §4.2, ADR-0008, ADR-0022. */

import {
  resolveTaskOperationalColour,
  taskColourDotClasses,
  type TaskOperationalColour,
} from '@/lib/tasks/task-colour';
import { todayUTCISODate } from '@/lib/tasks/task-reminder-state';

export type ScheduleAssignmentStatusInput = {
  task_status?: string;
  is_urgent?: boolean;
  case_deleted?: boolean;
  task_deleted?: boolean;
  is_overdue?: boolean;
  reminder_date?: string | null;
  deadline_date?: string | null;
  remind_days_before?: number | null;
};

export function isScheduleAssignmentDeleted(
  assignment: ScheduleAssignmentStatusInput,
): boolean {
  return assignment.case_deleted === true || assignment.task_deleted === true;
}

export function scheduleAssignmentOperationalColour(
  assignment: ScheduleAssignmentStatusInput,
  today: string = todayUTCISODate(),
): TaskOperationalColour {
  if (isScheduleAssignmentDeleted(assignment)) {
    return 'neutral';
  }

  return resolveTaskOperationalColour(
    {
      status: assignment.task_status ?? 'not_started',
      is_overdue: assignment.is_overdue ?? false,
      reminder_date: assignment.reminder_date ?? null,
      deadline_date: assignment.deadline_date ?? null,
      remind_days_before: assignment.remind_days_before ?? null,
      case_urgent: assignment.is_urgent ?? false,
    },
    today,
  );
}

export function scheduleAssignmentStatusLabel(
  assignment: ScheduleAssignmentStatusInput,
): string | null {
  if (isScheduleAssignmentDeleted(assignment)) {
    return 'DELETED';
  }

  if (assignment.task_status === 'blocked') {
    return 'BLOCKED';
  }

  if (assignment.task_status === 'completed') {
    return 'COMPLETED';
  }

  if (assignment.is_urgent) {
    return 'URGENT';
  }

  return null;
}

export function scheduleAssignmentStatusDotClass(
  assignment: ScheduleAssignmentStatusInput,
  today: string = todayUTCISODate(),
): string {
  if (isScheduleAssignmentDeleted(assignment)) {
    return 'bg-text-muted';
  }

  return taskColourDotClasses(scheduleAssignmentOperationalColour(assignment, today));
}

export function scheduleAssignmentStatusSuffix(
  assignment: ScheduleAssignmentStatusInput,
): string {
  const label = scheduleAssignmentStatusLabel(assignment);
  return label ? ` · ${label}` : '';
}
