import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createServiceClient } from '@/lib/supabase/service';
import {
  buildDuAlertNotificationRows,
  buildRevisionStaffNotificationRows,
  buildSeniorRevisionAdminAlertRows,
  buildLeadRejectedNotificationRows,
  buildNewTaskAssignmentNotificationRows,
  buildTaskBlockedAdminNotificationRows,
  buildTaskOverdueNotificationRows,
  buildTaskReassignedNotificationRows,
  buildUrgentCaseNotificationRows,
  collectAssignedStaffIds,
  type NotificationRow,
} from '@/lib/notifications/fanout';

/**
 * Server-only notification inserts (plan §A.2.2). Uses the service-role client
 * so rows bypass notifications RLS — delivery UI is ticket 0027.
 */

function dedupeKeysFromRows(rows: NotificationRow[]): string[] {
  return rows
    .map((row) => {
      const payload = row.payload as { dedupe_key?: string } | null | undefined;
      return payload?.dedupe_key ?? null;
    })
    .filter((key): key is string => Boolean(key));
}

async function filterRowsWithExistingDedupeKeys(
  client: SupabaseClient<Database>,
  rows: NotificationRow[],
): Promise<NotificationRow[]> {
  const keys = dedupeKeysFromRows(rows);
  if (keys.length === 0) {
    return rows;
  }

  const { data, error } = await client
    .from('notifications')
    .select('payload')
    .or(keys.map((key) => `payload->>dedupe_key.eq.${key}`).join(','));

  if (error) {
    throw error;
  }

  const existing = new Set(
    (data ?? [])
      .map((row) => (row.payload as { dedupe_key?: string } | null)?.dedupe_key)
      .filter((key): key is string => Boolean(key)),
  );

  return rows.filter((row) => {
    const key = (row.payload as { dedupe_key?: string } | null)?.dedupe_key;
    return !key || !existing.has(key);
  });
}

export async function insertNotificationRows(
  rows: Database['public']['Tables']['notifications']['Insert'][],
  service?: SupabaseClient<Database>,
  options?: { dedupe?: boolean },
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const client = service ?? createServiceClient();
  const toInsert =
    options?.dedupe === false
      ? rows
      : await filterRowsWithExistingDedupeKeys(client, rows as NotificationRow[]);

  if (toInsert.length === 0) {
    return 0;
  }

  const { error } = await client.from('notifications').insert(toInsert);

  if (error) {
    throw error;
  }

  return toInsert.length;
}

/** EP-07: one `urgent_case` row per assigned staff member when flagging urgent. */
export async function fanoutUrgentCaseNotifications(input: {
  caseId: string;
  clientName: string;
  adminName: string;
  tasks: Array<{ assigned_to: string | null }>;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const staffIds = collectAssignedStaffIds(input.tasks);

  const rows = buildUrgentCaseNotificationRows({
    caseId: input.caseId,
    clientName: input.clientName,
    adminName: input.adminName,
    staffIds,
  });

  return insertNotificationRows(rows, input.service);
}

/** EP-17: notify the staff member assigned to Task 5 when revisions are required. */
export async function fanoutRevisionRequiredStaffNotification(input: {
  userId: string;
  caseId: string;
  taskId: string;
  caseReference: string;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const rows = buildRevisionStaffNotificationRows({
    userId: input.userId,
    caseId: input.caseId,
    taskId: input.taskId,
    caseReference: input.caseReference,
  });

  return insertNotificationRows(rows, input.service);
}

/** ADR-0006: alert all active admins when revision count hits the threshold. */
export async function fanoutSeniorRevisionAdminAlert(input: {
  caseId: string;
  message: string;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const client = input.service ?? createServiceClient();

  const { data: admins, error } = await client
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (error || !admins?.length) {
    return 0;
  }

  const rows = buildSeniorRevisionAdminAlertRows({
    adminIds: admins.map((admin) => admin.id),
    caseId: input.caseId,
    message: input.message,
  });

  return insertNotificationRows(rows, client);
}

/** EP-13 / EP-59: notify assignee of a new scheduled task. */
export async function fanoutNewTaskAssignmentNotification(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isUrgent?: boolean;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const rows = buildNewTaskAssignmentNotificationRows(input);
  return insertNotificationRows(rows, input.service);
}

/** EP-59: notify the previous assignee when a task moves to someone else. */
export async function fanoutTaskReassignedNotification(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const rows = buildTaskReassignedNotificationRows(input);
  return insertNotificationRows(rows, input.service);
}

/** EP-14: notify all active admins when a task is blocked and slots are freed. */
export async function fanoutTaskBlockedAdminNotification(input: {
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
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const client = input.service ?? createServiceClient();

  const { data: admins, error } = await client
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (error || !admins?.length) {
    return 0;
  }

  const rows = buildTaskBlockedAdminNotificationRows({
    adminIds: admins.map((admin) => admin.id),
    taskId: input.taskId,
    caseId: input.caseId,
    taskName: input.taskName,
    caseReference: input.caseReference,
    blockedReason: input.blockedReason,
    releasedSlots: input.releasedSlots,
  });

  return insertNotificationRows(rows, client);
}

/** EP-06: notify other admins when a lead is rejected. */
export async function fanoutLeadRejectedNotifications(input: {
  adminIds: string[];
  caseId: string;
  clientName: string;
  adminName: string;
  reasonText: string;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  if (input.adminIds.length === 0) {
    return 0;
  }

  const rows = buildLeadRejectedNotificationRows(input);
  return insertNotificationRows(rows, input.service);
}

/** US-7.3: notify assignee when a task passes its allocated end time. */
export async function fanoutTaskOverdueNotification(input: {
  userId: string;
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  endTime: string;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const rows = buildTaskOverdueNotificationRows(input);
  return insertNotificationRows(rows, input.service);
}

/** ADR-0007: notify staff and admins during the DU escalation ladder. */
export async function fanoutDuAlertNotifications(input: {
  recipientIds: string[];
  taskId: string;
  caseId: string;
  taskName: string;
  caseReference: string;
  appointmentDate: string;
  severity: 'warning' | 'critical';
  alertDate: string;
  workingDaysRemaining: number;
  service?: SupabaseClient<Database>;
}): Promise<number> {
  const rows = input.recipientIds.flatMap((userId) =>
    buildDuAlertNotificationRows({
      userId,
      taskId: input.taskId,
      caseId: input.caseId,
      taskName: input.taskName,
      caseReference: input.caseReference,
      appointmentDate: input.appointmentDate,
      severity: input.severity,
      alertDate: input.alertDate,
      workingDaysRemaining: input.workingDaysRemaining,
    }),
  );

  return insertNotificationRows(rows, input.service);
}
