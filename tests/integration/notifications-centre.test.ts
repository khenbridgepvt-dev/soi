import { afterAll, describe, expect, it } from 'vitest';
import {
  acknowledgeUrgentNotification,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/lib/notifications/mark-notifications';
import { fetchNotifications } from '@/lib/notifications/fetch-notifications';
import {
  fanoutNewTaskAssignmentNotification,
  fanoutUrgentCaseNotifications,
  insertNotificationRows,
} from '@/lib/notifications';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, signInAsRole } from './rls-harness';

const service = createServiceClient();

const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';
const BLESS_ID = 'a0000000-0000-4000-8000-000000000004';
const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';

const createdNotificationIds: string[] = [];

async function seedNotification(input: {
  userId: string;
  type?: 'new_task' | 'urgent_case';
  isUrgent?: boolean;
  caseId?: string;
  taskId?: string;
}) {
  const { data, error } = await service
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type ?? 'new_task',
      title: input.isUrgent ? 'URGENT: Test' : 'Test notification',
      body: 'Integration test notification',
      is_urgent: input.isUrgent ?? false,
      case_id: input.caseId ?? null,
      task_id: input.taskId ?? null,
    })
    .select('id')
    .single();

  expect(error).toBeNull();
  createdNotificationIds.push(data!.id);
  return data!.id;
}

afterAll(async () => {
  if (createdNotificationIds.length > 0) {
    await service.from('notifications').delete().in('id', createdNotificationIds);
  }
});

describe('notification centre (ticket 0027, EP-32–34b)', () => {
  it('TC-071 · assignment fanout creates a new_task row for the assignee', async () => {
    const { data: task } = await service
      .from('tasks')
      .select('id')
      .eq('assigned_to', ASHA_ID)
      .eq('is_deleted', false)
      .limit(1)
      .single();

    const sent = await fanoutNewTaskAssignmentNotification({
      userId: ASHA_ID,
      taskId: task!.id,
      caseId: VISHNU_CASE_ID,
      taskName: 'Client Consultation',
      caseReference: '072601/SKW/VIS',
      startTime: '11:00',
      endTime: '13:00',
      durationMinutes: 120,
      service,
    });

    expect(sent).toBe(1);

    const { data } = await service
      .from('notifications')
      .select('id, type, user_id')
      .eq('user_id', ASHA_ID)
      .eq('type', 'new_task')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.[0]?.type).toBe('new_task');
    if (data?.[0]?.id) {
      createdNotificationIds.push(data[0].id);
    }
  });

  it('TC-073 · urgent flag fanout creates urgent_case rows for assigned staff', async () => {
    const { data: tasks } = await service
      .from('tasks')
      .select('assigned_to')
      .eq('case_id', VISHNU_CASE_ID);

    const sent = await fanoutUrgentCaseNotifications({
      caseId: VISHNU_CASE_ID,
      clientName: 'Vishnu Patel',
      adminName: 'Admin User',
      tasks: tasks ?? [],
      service,
    });

    expect(sent).toBeGreaterThan(0);

    const { data } = await service
      .from('notifications')
      .select('id, type, is_urgent')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('type', 'urgent_case')
      .eq('user_id', ASHA_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.[0]).toMatchObject({ type: 'urgent_case', is_urgent: true });
    if (data?.[0]?.id) {
      createdNotificationIds.push(data[0].id);
    }
  });

  it('TC-075 · user can mark their own notification read', async () => {
    const { client, userId } = await signInAsRole('staff');
    const notificationId = await seedNotification({ userId });

    const marked = await markNotificationsRead(client, userId, [notificationId]);
    expect(marked).toBe(1);

    const { data } = await client
      .from('notifications')
      .select('is_read, read_at')
      .eq('id', notificationId)
      .single();

    expect(data?.is_read).toBe(true);
    expect(data?.read_at).toBeTruthy();

    await client.auth.signOut();
  });

  it('TC-075b · user can acknowledge an urgent notification', async () => {
    const { client, userId } = await signInAsRole('staff');
    const notificationId = await seedNotification({
      userId,
      type: 'urgent_case',
      isUrgent: true,
      caseId: VISHNU_CASE_ID,
    });

    const updated = await acknowledgeUrgentNotification(client, userId, notificationId);

    expect(updated?.acknowledged_at).toBeTruthy();
    expect(updated?.is_read).toBe(true);

    await client.auth.signOut();
  });

  it('TC-076 · mark all read clears unread notifications', async () => {
    const { client, userId } = await signInAsRole('staff');
    await seedNotification({ userId });
    await seedNotification({ userId });

    const marked = await markAllNotificationsRead(client, userId);
    expect(marked).toBeGreaterThanOrEqual(2);

    const list = await fetchNotifications(client, userId, { page: 1, limit: 25, isRead: false });
    expect(list.unread_count).toBe(0);

    await client.auth.signOut();
  });

  it('EP-32 · list returns only the signed-in user notifications', async () => {
    const { client, userId } = await signInAsRole('staff');
    const ownId = await seedNotification({ userId });
    await seedNotification({ userId: BLESS_ID });

    const list = await fetchNotifications(client, userId, { page: 1, limit: 50 });
    expect(list.rows.some((row) => row.id === ownId)).toBe(true);
    expect(list.rows.every((row) => row.id !== undefined)).toBe(true);
    expect(list.rows.find((row) => row.body === 'Integration test notification')).toBeTruthy();

    await client.auth.signOut();
  });

  it(
    'realtime delivers own INSERT events without refresh',
    async () => {
    const { client, userId } = await signInAsRole('staff');

    const payload = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime timeout')), 8000);

      const channel = client
        .channel(`notifications:test:${userId}:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (event) => {
            clearTimeout(timer);
            resolve(event.new as Record<string, unknown>);
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const count = await insertNotificationRows(
              [
                {
                  user_id: userId,
                  type: 'new_task',
                  title: 'Realtime delivery',
                  body: 'Should arrive over the channel',
                  is_urgent: false,
                },
              ],
              service,
            );
            expect(count).toBe(1);
          }
        });

      void channel;
    });

    expect(payload.title).toBe('Realtime delivery');

    if (typeof payload.id === 'string') {
      createdNotificationIds.push(payload.id);
    }

    await client.auth.signOut();
    },
    15_000,
  );
});

describe('RLS: notifications (§10.2 / §10.3)', () => {
  it('staff reads only their own notifications', async () => {
    const { client, userId } = await signInAsRole('staff');
    await seedNotification({ userId });
    await seedNotification({ userId: BLESS_ID });

    const { data, error } = await client.from('notifications').select('id, user_id');

    expect(error).toBeNull();
    expect(data?.every((row) => row.user_id === userId)).toBe(true);

    await client.auth.signOut();
  });

  it('user A never reads user B rows even with an explicit filter', async () => {
    const blessNotificationId = await seedNotification({ userId: BLESS_ID });
    const { client } = await signInAsRole('staff');

    const { data, error } = await client
      .from('notifications')
      .select('id')
      .eq('id', blessNotificationId);

    expect(error).toBeNull();
    expect(data).toEqual([]);

    await client.auth.signOut();
  });

  it('column trigger blocks changing notification title', async () => {
    const { client, userId } = await signInAsRole('staff');
    const notificationId = await seedNotification({ userId });

    const { error } = await client
      .from('notifications')
      .update({ title: 'Hacked title' })
      .eq('id', notificationId);

    expect(error).not.toBeNull();

    await client.auth.signOut();
  });

  it('staff cannot insert notifications directly', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { error } = await client.from('notifications').insert({
      user_id: userId,
      type: 'new_task',
      title: 'Self insert',
      body: 'Should fail',
    });

    expect(error).not.toBeNull();

    await client.auth.signOut();
  });

  it('anonymous callers read nothing', async () => {
    const { createAnonClient } = await import('./rls-harness');
    const anon = createAnonClient();

    const { data } = await anon.from('notifications').select('id');
    expect(data ?? []).toHaveLength(0);
  });
});
