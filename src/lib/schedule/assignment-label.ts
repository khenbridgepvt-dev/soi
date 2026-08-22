/** Schedule pill labels (S-04, S-11) — ticket 0045 name-first display. */

import { scheduleAssignmentTeamColour } from '@/lib/schedule/assignment-status';
import {
  teamTaskStatusCellClasses,
} from '@/lib/tasks/team-task-status-colour';
import { todayUTCISODate } from '@/lib/tasks/task-reminder-state';

export type ScheduleAssignmentLabelInput = {
  task_name: string;
  task_abbreviation?: string;
  case_reference?: string | null;
  client_name?: string | null;
  start_time: string;
  end_time: string;
  case_is_internal?: boolean;
};

export type ScheduleAssignmentNavInput = ScheduleAssignmentLabelInput & {
  case_id: string | null;
  case_deleted?: boolean;
  task_deleted?: boolean;
  task_status?: string;
  is_urgent?: boolean;
  is_overdue?: boolean;
  reminder_date?: string | null;
  deadline_date?: string | null;
  remind_days_before?: number | null;
};

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function formatScheduleAssignmentPrimaryLabel(
  assignment: ScheduleAssignmentLabelInput,
): string {
  const name = assignment.task_name?.trim();
  if (name) {
    return name;
  }

  return assignment.task_abbreviation?.trim() || 'Booked';
}

/** Compact single-line label for staff calendar pills. */
export function formatScheduleAssignmentCompactLabel(
  assignment: ScheduleAssignmentLabelInput,
): string {
  const primary = formatScheduleAssignmentPrimaryLabel(assignment);

  if (assignment.case_is_internal) {
    return `${primary} · ${formatTimeRange(assignment.start_time, assignment.end_time)}`;
  }

  const client = assignment.client_name?.trim() || '—';
  return `${primary} · ${client}`;
}

/** Secondary line under the primary label on admin / preview grids. */
export function formatScheduleAssignmentDetailLine(
  assignment: ScheduleAssignmentLabelInput,
  variant: 'admin' | 'preview',
): string {
  if (assignment.case_is_internal) {
    return formatTimeRange(assignment.start_time, assignment.end_time);
  }

  if (variant === 'preview') {
    return assignment.client_name?.trim() || '—';
  }

  return assignment.client_name?.trim() || '—';
}

/** Accessible / tooltip label for booked slots. */
export function formatScheduleAssignmentAriaLabel(
  assignment: ScheduleAssignmentLabelInput,
  variant: 'admin' | 'staff' | 'preview',
): string {
  const primary = formatScheduleAssignmentPrimaryLabel(assignment);
  const time = formatTimeRange(assignment.start_time, assignment.end_time);

  if (assignment.case_is_internal) {
    return `${primary} · ${time}`;
  }

  if (variant === 'staff') {
    const reference = assignment.case_reference ?? 'No reference';
    const client = assignment.client_name ?? 'Unknown client';
    return `${primary} · ${reference} · ${client}`;
  }

  if (variant === 'preview') {
    const reference = assignment.case_reference ?? 'No reference';
    return `${primary} · ${reference}`;
  }

  const reference = assignment.case_reference ?? 'No reference';
  const client = assignment.client_name ?? 'Unknown client';
  return `${primary} · ${reference} · ${client} · ${time}`;
}

export function isScheduleAssignmentNavigable(assignment: ScheduleAssignmentNavInput): boolean {
  if (!assignment.case_id || assignment.case_is_internal) {
    return false;
  }

  return !assignment.case_deleted && !assignment.task_deleted;
}

export function scheduleAssignmentPillClassName(
  assignment: ScheduleAssignmentNavInput,
  options?: {
    extra?: string;
    viewedDate?: string;
    now?: Date;
  },
): string | undefined {
  const viewedDate = options?.viewedDate ?? todayUTCISODate();
  const colour = scheduleAssignmentTeamColour(
    {
      task_status: assignment.task_status,
      is_overdue: assignment.is_overdue,
      case_deleted: assignment.case_deleted,
      task_deleted: assignment.task_deleted,
      assignmentDate: viewedDate,
      end_time: assignment.end_time,
    },
    viewedDate,
    options?.now,
  );

  const classes = [
    teamTaskStatusCellClasses(colour),
    options?.extra,
    assignment.case_is_internal ? undefined : undefined,
  ].filter(Boolean);

  return classes.length > 0 ? classes.join(' ') : undefined;
}
