import { formatLongDate } from '@/lib/utils/dates';
import { scheduleAssignmentStatusSuffix } from '@/lib/schedule/assignment-status';
import type { ScheduleAssignmentStatusInput } from '@/lib/schedule/assignment-status';
import type { TeamWorkloadSummary } from '@/lib/schedule/team-workload-summary';

export type TaskViewFilter = 'all' | 'active' | 'done';

export const SCHEDULE_PAGE_TITLE = 'Team schedule';

export const SCHEDULE_PAGE_SUBTITLE =
  'Click a free slot or assign a task to add work to the calendar.';

export const SCHEDULE_TODAY_CHIP_LABEL = 'Today';

export const SCHEDULE_FILTER_LABEL = 'Show:';

export const SCHEDULE_COLOUR_KEY_LABEL = 'Colour key';

export const SCHEDULE_COLUMN_OFF_LABEL = 'Off today';

export const SCHEDULE_ASSIGN_TASK_LABEL = 'Assign task';

export function formatScheduleEmptySlotHover(time: string): string {
  return `Assign task at ${time}`;
}

export function formatScheduleEmptyDayMessage(date: string): string {
  return `No tasks scheduled for ${formatLongDate(date)}. Assign a task or choose another date.`;
}

export const SCHEDULE_NO_STAFF_MESSAGE =
  'No team members set up. Go to Staff Members to add people.';

export function formatScheduleFilterLabel(filter: TaskViewFilter): string {
  if (filter === 'all') {
    return 'All';
  }

  if (filter === 'active') {
    return 'Active';
  }

  return 'Done';
}

export function formatScheduleBookedHoursLine(
  bookedMinutes: number,
  workingMinutes: number,
  formatHours: (minutes: number) => string,
): string {
  return `${formatHours(bookedMinutes)} / ${formatHours(workingMinutes)}h booked`;
}

export function formatScheduleColumnStats(
  summary: TeamWorkloadSummary,
  bookedMinutes: number,
  workingMinutes: number,
  formatHours: (minutes: number) => string,
): string {
  const bookedLine = formatScheduleBookedHoursLine(bookedMinutes, workingMinutes, formatHours);
  return `${bookedLine} · Active ${summary.inProgress} · Done ${summary.doneToday} · Overdue ${summary.overdue}`;
}

export function formatSchedulePageStatusSuffix(
  assignment: ScheduleAssignmentStatusInput,
): string {
  const suffix = scheduleAssignmentStatusSuffix(assignment);
  return suffix.replace(' · COMPLETED', ' · Done');
}

export type ScheduleFilterableAssignment = {
  task_status: string;
  case_deleted?: boolean;
  task_deleted?: boolean;
};

export function assignmentMatchesTaskViewFilter(
  assignment: ScheduleFilterableAssignment,
  filter: TaskViewFilter,
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

export function computeDefaultTaskViewFilter(
  staff: { assignments: ScheduleFilterableAssignment[] }[],
): TaskViewFilter {
  const hasActive = staff.some((member) =>
    member.assignments.some(
      (assignment) =>
        !assignment.case_deleted &&
        !assignment.task_deleted &&
        assignment.task_status !== 'completed',
    ),
  );

  return hasActive ? 'active' : 'all';
}
