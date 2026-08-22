import { formatLongDate } from '@/lib/utils/dates';
import type { TaskStatusChipVariant } from '@/lib/tasks/firm-tasks-ui';

export type StaffCalendarFilter = 'all' | 'active' | 'done';

export const STAFF_CALENDAR_TITLE = 'My calendar';

export const STAFF_CALENDAR_TODAY_CHIP = 'Today';

export const STAFF_CALENDAR_FILTER_LABEL = 'Show:';

export const STAFF_CALENDAR_COLUMN_HEADER = 'Your day';

export const STAFF_CALENDAR_FREE_SLOT_LABEL = 'Free';

export const STAFF_CALENDAR_COLOUR_KEY_LABEL = 'Colour key';

export const STAFF_CALENDAR_FILTER_OPTIONS: { id: StaffCalendarFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
];

export function staffCalendarSubtitle(date: string): string {
  return `Your schedule for ${formatLongDate(date)}`;
}

export function formatStaffCalendarFilterLabel(filter: StaffCalendarFilter): string {
  return STAFF_CALENDAR_FILTER_OPTIONS.find((option) => option.id === filter)?.label ?? filter;
}

export type ScheduleAssignmentFilterInput = {
  task_status: string;
  case_deleted?: boolean;
  task_deleted?: boolean;
};

export function isScheduleAssignmentOverdue(
  assignment: ScheduleAssignmentFilterInput & { is_overdue?: boolean },
): boolean {
  return assignment.is_overdue === true && assignment.task_status !== 'completed';
}

export function assignmentMatchesStaffCalendarFilter(
  assignment: ScheduleAssignmentFilterInput,
  filter: StaffCalendarFilter,
): boolean {
  if (assignment.case_deleted || assignment.task_deleted) {
    return true;
  }

  if (filter === 'all') {
    return true;
  }

  if (filter === 'done') {
    return assignment.task_status === 'completed';
  }

  return assignment.task_status !== 'completed';
}

export function computeDefaultStaffCalendarFilter(
  assignments: ScheduleAssignmentFilterInput[],
): StaffCalendarFilter {
  const hasActive = assignments.some(
    (assignment) =>
      !assignment.case_deleted &&
      !assignment.task_deleted &&
      assignment.task_status !== 'completed',
  );

  return hasActive ? 'active' : 'all';
}

export function getScheduleAssignmentChipVariants(
  assignment: ScheduleAssignmentFilterInput & { is_overdue?: boolean },
): TaskStatusChipVariant[] {
  const chips: TaskStatusChipVariant[] = [];

  if (isScheduleAssignmentOverdue(assignment)) {
    chips.push('overdue');
  }

  if (assignment.task_status === 'not_started') {
    chips.push('not_started');
  } else if (assignment.task_status === 'in_progress') {
    chips.push('in_progress');
  } else if (assignment.task_status === 'completed') {
    chips.push('done');
  } else if (assignment.task_status === 'blocked') {
    chips.push('blocked');
  }

  return chips;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}
