import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { buildPaginationMeta } from '@/lib/cases/list-query';

export type NotificationRecord = {
  id: string;
  type: Database['public']['Enums']['notification_type'];
  title: string;
  body: string;
  is_urgent: boolean;
  is_read: boolean;
  read_at: string | null;
  acknowledged_at: string | null;
  case_id: string | null;
  task_id: string | null;
  created_at: string;
};

export type NotificationListResult = {
  rows: NotificationRecord[];
  total: number;
  unread_count: number;
  urgent_unread_count: number;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function parseNotificationListQuery(searchParams: URLSearchParams): {
  isRead?: boolean;
  page: number;
  limit: number;
} {
  const isReadParam = searchParams.get('is_read');
  let isRead: boolean | undefined;

  if (isReadParam === 'true') {
    isRead = true;
  } else if (isReadParam === 'false') {
    isRead = false;
  }

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit || DEFAULT_LIMIT));

  return { isRead, page, limit };
}

export async function fetchNotifications(
  client: SupabaseClient<Database>,
  userId: string,
  query: { isRead?: boolean; page: number; limit: number },
): Promise<NotificationListResult> {
  let listQuery = client
    .from('notifications')
    .select(
      'id, type, title, body, is_urgent, is_read, read_at, acknowledged_at, case_id, task_id, created_at',
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (query.isRead !== undefined) {
    listQuery = listQuery.eq('is_read', query.isRead);
  }

  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;

  const { data, error, count } = await listQuery.range(from, to);

  if (error) {
    throw error;
  }

  const [{ count: unreadCount }, { count: urgentUnreadCount }] = await Promise.all([
    client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
    client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_urgent', true)
      .eq('is_read', false),
  ]);

  return {
    rows: (data ?? []) as NotificationRecord[],
    total: count ?? 0,
    unread_count: unreadCount ?? 0,
    urgent_unread_count: urgentUnreadCount ?? 0,
  };
}

export { buildPaginationMeta };
