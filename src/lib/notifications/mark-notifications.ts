import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { NotificationRecord } from '@/lib/notifications/fetch-notifications';

export async function markNotificationsRead(
  client: SupabaseClient<Database>,
  userId: string,
  notificationIds: string[],
): Promise<number> {
  if (notificationIds.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();

  const { data, error } = await client
    .from('notifications')
    .update({ is_read: true, read_at: now })
    .eq('user_id', userId)
    .in('id', notificationIds)
    .eq('is_read', false)
    .select('id');

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}

export async function markAllNotificationsRead(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('notifications')
    .update({ is_read: true, read_at: now })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}

export async function acknowledgeUrgentNotification(
  client: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<NotificationRecord | null> {
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await client
    .from('notifications')
    .select('id, is_urgent, acknowledged_at')
    .eq('id', notificationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    return null;
  }

  if (!existing.is_urgent) {
    throw new Error('NOT_URGENT');
  }

  const { data, error } = await client
    .from('notifications')
    .update({
      acknowledged_at: now,
      acknowledged_by: userId,
      is_read: true,
      read_at: now,
    })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select(
      'id, type, title, body, is_urgent, is_read, read_at, acknowledged_at, case_id, task_id, created_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return data as NotificationRecord;
}
