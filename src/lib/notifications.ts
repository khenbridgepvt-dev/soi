import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createServiceClient } from '@/lib/supabase/service';
import {
  buildRevisionStaffNotificationRows,
  buildSeniorRevisionAdminAlertRows,
  buildUrgentCaseNotificationRows,
  collectAssignedStaffIds,
} from '@/lib/notifications/fanout';

/**
 * Server-only notification inserts (plan §A.2.2). Uses the service-role client
 * so rows bypass notifications RLS — delivery UI is ticket 0027.
 */

export async function insertNotificationRows(
  rows: Database['public']['Tables']['notifications']['Insert'][],
  service?: SupabaseClient<Database>,
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const client = service ?? createServiceClient();
  const { error } = await client.from('notifications').insert(rows);

  if (error) {
    throw error;
  }

  return rows.length;
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
