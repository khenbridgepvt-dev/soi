import type { Database } from '@/types/database';

export type UrgentNotificationInsert = {
  user_id: string;
  type: 'urgent_case';
  title: string;
  body: string;
  is_urgent: true;
  case_id: string;
};

/** Distinct staff IDs assigned to any task in the case (EP-07 fanout). */
export function collectAssignedStaffIds(
  tasks: Array<{ assigned_to: string | null }>,
): string[] {
  const ids = new Set<string>();

  for (const task of tasks) {
    if (task.assigned_to) {
      ids.add(task.assigned_to);
    }
  }

  return [...ids];
}

export function buildUrgentCaseNotifications(input: {
  caseId: string;
  clientName: string;
  adminName: string;
  staffIds: string[];
}): UrgentNotificationInsert[] {
  return input.staffIds.map((userId) => ({
    user_id: userId,
    type: 'urgent_case',
    title: 'Case flagged urgent',
    body: `${input.clientName} was flagged as urgent by ${input.adminName}.`,
    is_urgent: true,
    case_id: input.caseId,
  }));
}

export type NotificationRow = Database['public']['Tables']['notifications']['Insert'];

export function buildUrgentCaseNotificationRows(input: {
  caseId: string;
  clientName: string;
  adminName: string;
  staffIds: string[];
}): NotificationRow[] {
  return buildUrgentCaseNotifications(input);
}

export function buildRevisionStaffNotificationRows(input: {
  userId: string;
  caseId: string;
  taskId: string;
  caseReference: string;
}): NotificationRow[] {
  return [
    {
      user_id: input.userId,
      type: 'new_task',
      title: 'Revisions required',
      body: `Senior review requested revisions on ${input.caseReference}. Task 5 has been reopened.`,
      is_urgent: false,
      case_id: input.caseId,
      task_id: input.taskId,
    },
  ];
}

export function buildSeniorRevisionAdminAlertRows(input: {
  adminIds: string[];
  caseId: string;
  message: string;
}): NotificationRow[] {
  return input.adminIds.map((userId) => ({
    user_id: userId,
    type: 'senior_revision_alert',
    title: 'Senior review revision threshold',
    body: input.message,
    is_urgent: false,
    case_id: input.caseId,
  }));
}

export function buildNewTaskAssignmentNotificationRows(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isUrgent?: boolean;
}): NotificationRow[] {
  return [
    {
      user_id: input.userId,
      type: 'new_task',
      title: 'New task assigned',
      body: `${input.taskName} · ${input.caseReference} · ${input.startTime}–${input.endTime} (${input.durationMinutes} min)`,
      is_urgent: input.isUrgent ?? false,
      case_id: input.caseId,
      task_id: input.taskId,
    },
  ];
}

export function buildTaskBlockedAdminNotificationRows(input: {
  adminIds: string[];
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  blockedReason: string;
  releasedSlots: Array<{
    staff_name: string;
    date: string;
    start_time: string;
    end_time: string;
  }>;
}): NotificationRow[] {
  const slotSummary =
    input.releasedSlots.length === 0
      ? 'No future time slots were scheduled.'
      : input.releasedSlots
          .map(
            (slot) =>
              `${slot.staff_name} · ${slot.date} · ${slot.start_time}–${slot.end_time}`,
          )
          .join('; ');

  return input.adminIds.map((userId) => ({
    user_id: userId,
    type: 'task_blocked',
    title: 'Task blocked — time slot freed',
    body: `${input.taskName} · ${input.caseReference} — ${slotSummary}. Reason: ${input.blockedReason}`,
    is_urgent: false,
    case_id: input.caseId,
    task_id: input.taskId,
  }));
}

export function buildTaskReassignedNotificationRows(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
}): NotificationRow[] {
  return [
    {
      user_id: input.userId,
      type: 'new_task',
      title: 'Task reassigned',
      body: `${input.taskName} · ${input.caseReference} has been reassigned to another staff member.`,
      is_urgent: false,
      case_id: input.caseId,
      task_id: input.taskId,
    },
  ];
}

export function buildLeadRejectedNotificationRows(input: {
  adminIds: string[];
  caseId: string;
  clientName: string;
  adminName: string;
  reasonText: string;
}): NotificationRow[] {
  return input.adminIds.map((userId) => ({
    user_id: userId,
    type: 'urgent_case',
    title: 'Lead Rejected',
    body: `Case ${input.clientName} was rejected by ${input.adminName}. Reason: ${input.reasonText}`,
    is_urgent: false,
    case_id: input.caseId,
  }));
}

export function buildRescheduleRequestNotificationRows(input: {
  adminIds: string[];
  rescheduleRequestId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  staffName: string;
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  proposedDurationMinutes: number;
  reason: string | null;
  isOvertime?: boolean;
}): NotificationRow[] {
  const slotText = `${input.proposedDate} · ${input.proposedStartTime}–${input.proposedEndTime} (${input.proposedDurationMinutes} min)`;
  const noteSuffix = input.reason ? ` Note: ${input.reason}` : '';
  const overtimeSuffix = input.isOvertime ? ' (outside working hours)' : '';

  return input.adminIds.map((userId) => ({
    user_id: userId,
    type: 'reschedule_request',
    title: 'Reschedule requested',
    body: `${input.staffName} requested ${input.taskName} · ${input.caseReference} → ${slotText}${overtimeSuffix}.${noteSuffix}`,
    is_urgent: false,
    case_id: input.caseId,
    task_id: input.taskId,
    payload: {
      reschedule_request_id: input.rescheduleRequestId,
      proposed_date: input.proposedDate,
      proposed_start_time: input.proposedStartTime,
      proposed_duration_minutes: input.proposedDurationMinutes,
    },
  }));
}

export function buildRescheduleResponseNotificationRows(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  outcome: 'approved' | 'rejected';
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  rejectionReason?: string | null;
}): NotificationRow[] {
  const slotText = `${input.proposedDate} · ${input.proposedStartTime}–${input.proposedEndTime}`;
  const isApproved = input.outcome === 'approved';
  const reasonSuffix =
    !isApproved && input.rejectionReason ? ` Reason: ${input.rejectionReason}` : '';

  return [
    {
      user_id: input.userId,
      type: 'reschedule_response',
      title: isApproved ? 'Reschedule approved' : 'Reschedule rejected',
      body: isApproved
        ? `${input.taskName} · ${input.caseReference} moved to ${slotText}.`
        : `${input.taskName} · ${input.caseReference} — request for ${slotText} was declined.${reasonSuffix}`,
      is_urgent: false,
      case_id: input.caseId,
      task_id: input.taskId,
      payload: {
        outcome: input.outcome,
        proposed_date: input.proposedDate,
        proposed_start_time: input.proposedStartTime,
        proposed_end_time: input.proposedEndTime,
        rejection_reason: input.rejectionReason ?? null,
      },
    },
  ];
}

export function notificationDedupeKey(
  userId: string,
  kind: string,
  parts: string[],
): string {
  return `${userId}:${kind}:${parts.join(':')}`;
}

export function buildTaskOverdueNotificationRows(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  endTime: string;
}): NotificationRow[] {
  const dedupeKey = notificationDedupeKey(input.userId, 'task_overdue', [input.taskId]);

  return [
    {
      user_id: input.userId,
      type: 'task_overdue',
      title: 'Task overdue',
      body: `${input.taskName} · ${input.caseReference} was due at ${input.endTime}`,
      is_urgent: true,
      case_id: input.caseId,
      task_id: input.taskId,
      payload: { dedupe_key: dedupeKey },
    },
  ];
}

export function formatFirmTaskCompletedNotificationBody(input: {
  staffName: string;
  taskName: string;
  slotStartTime?: string | null;
  slotEndTime?: string | null;
}): string {
  const base = `${input.staffName} completed ${input.taskName}`;

  if (input.slotStartTime && input.slotEndTime) {
    return `${base} · ${input.slotStartTime}–${input.slotEndTime}`;
  }

  return base;
}

export function buildFirmTaskAssignedNotificationRows(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  startTime: string;
  endTime: string;
}): NotificationRow[] {
  return [
    {
      user_id: input.userId,
      type: 'task_status_changed',
      title: 'Team task assigned',
      body: `${input.taskName} · ${input.startTime}–${input.endTime}`,
      is_urgent: false,
      case_id: input.caseId,
      task_id: input.taskId,
    },
  ];
}

export function buildFirmTaskCompletedNotificationRows(input: {
  adminIds: string[];
  staffName: string;
  taskName: string;
  taskId: string;
  caseId: string;
  slotStartTime?: string | null;
  slotEndTime?: string | null;
}): NotificationRow[] {
  const body = formatFirmTaskCompletedNotificationBody(input);

  return input.adminIds.map((userId) => ({
    user_id: userId,
    type: 'task_status_changed',
    title: 'Team task completed',
    body,
    is_urgent: false,
    case_id: input.caseId,
    task_id: input.taskId,
  }));
}

export function buildDuAlertNotificationRows(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  appointmentDate: string;
  severity: 'warning' | 'critical';
  alertDate: string;
  workingDaysRemaining: number;
}): NotificationRow[] {
  const dedupeKey = notificationDedupeKey(input.userId, 'du_alert', [
    input.taskId,
    input.alertDate,
  ]);
  const isCritical = input.severity === 'critical';

  return [
    {
      user_id: input.userId,
      type: 'du_alert',
      title: isCritical ? 'Document upload critical' : 'Document upload approaching',
      body: `${input.taskName} · ${input.caseReference} — appointment ${input.appointmentDate} (${input.workingDaysRemaining} working day(s) remaining)`,
      is_urgent: isCritical,
      case_id: input.caseId,
      task_id: input.taskId,
      payload: {
        dedupe_key: dedupeKey,
        severity: input.severity,
        working_days_remaining: input.workingDaysRemaining,
        appointment_date: input.appointmentDate,
      },
    },
  ];
}
