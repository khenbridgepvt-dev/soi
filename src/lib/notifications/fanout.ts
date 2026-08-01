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
