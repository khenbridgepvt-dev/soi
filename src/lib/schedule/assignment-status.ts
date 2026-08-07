/** Shared schedule pill status labels (S-04, S-11) — design_system §4.2, ADR-0008. */

export type ScheduleAssignmentStatusInput = {
  task_status: string;
  is_urgent?: boolean;
  case_deleted?: boolean;
  task_deleted?: boolean;
};

export function isScheduleAssignmentDeleted(
  assignment: ScheduleAssignmentStatusInput,
): boolean {
  return assignment.case_deleted === true || assignment.task_deleted === true;
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
): string {
  if (isScheduleAssignmentDeleted(assignment)) {
    return 'bg-text-muted';
  }

  if (assignment.task_status === 'blocked') {
    return 'bg-status-blocked-border';
  }

  if (assignment.task_status === 'completed') {
    return 'bg-status-onTrack-border';
  }

  if (assignment.is_urgent) {
    return 'bg-error';
  }

  return 'bg-status-onTrack-border';
}

export function scheduleAssignmentStatusSuffix(
  assignment: ScheduleAssignmentStatusInput,
): string {
  const label = scheduleAssignmentStatusLabel(assignment);
  return label ? ` · ${label}` : '';
}
