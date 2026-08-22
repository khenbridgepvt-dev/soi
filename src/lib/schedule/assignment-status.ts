/** Shared schedule pill status labels (S-04, S-11) — Team Task OS status-first colours (ADR-0023). */

import {
  resolveTeamTaskStatusColour,
  teamTaskStatusDotClasses,
  type TeamTaskStatusColourInput,
} from '@/lib/tasks/team-task-status-colour';
import { todayUTCISODate } from '@/lib/tasks/task-reminder-state';

export type ScheduleAssignmentStatusInput = TeamTaskStatusColourInput & {
  is_urgent?: boolean;
  reminder_date?: string | null;
  deadline_date?: string | null;
  remind_days_before?: number | null;
};

export function isScheduleAssignmentDeleted(
  assignment: ScheduleAssignmentStatusInput,
): boolean {
  return assignment.case_deleted === true || assignment.task_deleted === true;
}

export function scheduleAssignmentTeamColour(
  assignment: ScheduleAssignmentStatusInput,
  viewedDate: string = todayUTCISODate(),
  now?: Date,
): ReturnType<typeof resolveTeamTaskStatusColour> {
  if (isScheduleAssignmentDeleted(assignment)) {
    return 'deleted';
  }

  return resolveTeamTaskStatusColour({
    task_status: assignment.task_status,
    is_overdue: assignment.is_overdue,
    case_deleted: assignment.case_deleted,
    task_deleted: assignment.task_deleted,
    assignmentDate: assignment.assignmentDate ?? viewedDate,
    end_time: assignment.end_time,
    viewedDate,
    now,
  });
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
  viewedDate: string = todayUTCISODate(),
  now?: Date,
): string {
  return teamTaskStatusDotClasses(
    scheduleAssignmentTeamColour(assignment, viewedDate, now),
  );
}

export function scheduleAssignmentStatusSuffix(
  assignment: ScheduleAssignmentStatusInput,
): string {
  const label = scheduleAssignmentStatusLabel(assignment);
  return label ? ` · ${label}` : '';
}
