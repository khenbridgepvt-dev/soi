import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assignTask } from '@/lib/tasks/assign-task';
import { blockTask, unblockTask } from '@/lib/tasks/block-task';
import { fetchBlockedTasks } from '@/lib/tasks/fetch-blocked-tasks';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { addDays, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, signInAsRole } from './rls-harness';

const service = createServiceClient();

const TARGET_DATE = addDays(todayISODate(), 2);
const TODAY = todayISODate();
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

let taskId: string;
const createdAssignmentIds: string[] = [];
let savedStatus: 'not_started' | 'in_progress' | 'completed' | 'blocked';
let savedBlockedAt: string | null;
let savedBlockedReason: string | null;

async function assignViaAdmin(
  task: string,
  input: {
    staff_id: string;
    date: string;
    start_time: string;
    duration_minutes: number;
  },
) {
  const { client } = await signInAsRole('admin');
  const result = await assignTask(client, task, input);
  await client.auth.signOut();
  return result;
}

beforeAll(async () => {
  const { data: task } = await service
    .from('tasks')
    .select('id, status, blocked_at, blocked_reason')
    .eq('assigned_to', ASHA_ID)
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .order('sequence', { ascending: true })
    .limit(1)
    .single();

  taskId = task!.id;
  savedStatus = task!.status as typeof savedStatus;
  savedBlockedAt = task!.blocked_at;
  savedBlockedReason = task!.blocked_reason;

  await service.from('task_assignments').delete().eq('task_id', taskId);
  await service
    .from('tasks')
    .update({
      status: 'in_progress',
      blocked_at: null,
      blocked_reason: null,
    })
    .eq('id', taskId);
});

afterAll(async () => {
  if (createdAssignmentIds.length > 0) {
    await service.from('task_assignments').delete().in('id', createdAssignmentIds);
  }

  await service.from('task_assignments').delete().eq('task_id', taskId);

  await service
    .from('tasks')
    .update({
      status: savedStatus,
      blocked_at: savedBlockedAt,
      blocked_reason: savedBlockedReason,
    })
    .eq('id', taskId);
});

describe('EP-14 · block task', () => {
  it('releases future slots when blocked (TC-064)', async () => {
    const assignResult = await assignViaAdmin(taskId, {
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '11:00',
      duration_minutes: 120,
    });

    expect(assignResult.ok).toBe(true);
    if (!assignResult.ok) {
      return;
    }

    createdAssignmentIds.push(assignResult.data.assignment_id);

    const { client } = await signInAsRole('admin');
    const blockResult = await blockTask(
      client,
      taskId,
      { reason: 'Client not responding to emails' },
      { userId: (await client.auth.getUser()).data.user!.id, role: 'admin' },
    );

    expect(blockResult.ok).toBe(true);
    if (!blockResult.ok) {
      await client.auth.signOut();
      return;
    }

    expect(blockResult.data.status).toBe('blocked');
    expect(blockResult.data.slots_released).toBe(1);

    const { data: assignment } = await service
      .from('task_assignments')
      .select('is_released')
      .eq('id', assignResult.data.assignment_id)
      .single();

    expect(assignment?.is_released).toBe(true);

    const schedule = await fetchSchedule(client, TARGET_DATE, { staffId: ASHA_ID });
    const asha = schedule.staff[0];
    const slot = asha.slots.find((row) => row.start === '11:00');

    expect(slot?.state).toBe('available');

    const { data: notification } = await service
      .from('notifications')
      .select('type')
      .eq('task_id', taskId)
      .eq('type', 'task_blocked')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification?.[0]?.type).toBe('task_blocked');

    await client.auth.signOut();
  });

  it('keeps past assignments unreleased while releasing future ones', async () => {
    await service
      .from('tasks')
      .update({
        status: 'in_progress',
        blocked_at: null,
        blocked_reason: null,
      })
      .eq('id', taskId);

    await service.from('task_assignments').delete().eq('task_id', taskId);

    const { data: pastAssignment, error: pastError } = await service
      .from('task_assignments')
      .insert({
        task_id: taskId,
        staff_id: ASHA_ID,
        date: TODAY,
        start_time: '00:00',
        end_time: '00:30',
        duration_minutes: 30,
      })
      .select('id')
      .single();

    expect(pastError).toBeNull();
    expect(pastAssignment?.id).toBeTruthy();

    const { data: futureAssignment, error: futureError } = await service
      .from('task_assignments')
      .insert({
        task_id: taskId,
        staff_id: ASHA_ID,
        date: TARGET_DATE,
        start_time: '14:00',
        end_time: '15:00',
        duration_minutes: 60,
      })
      .select('id')
      .single();

    expect(futureError).toBeNull();
    expect(futureAssignment?.id).toBeTruthy();

    if (pastAssignment?.id) {
      createdAssignmentIds.push(pastAssignment.id);
    }
    if (futureAssignment?.id) {
      createdAssignmentIds.push(futureAssignment.id);
    }

    const { client } = await signInAsRole('admin');
    const blockResult = await blockTask(
      client,
      taskId,
      { reason: 'Awaiting client documents' },
      { userId: (await client.auth.getUser()).data.user!.id, role: 'admin' },
    );

    expect(blockResult.ok).toBe(true);
    if (!blockResult.ok) {
      await client.auth.signOut();
      return;
    }

    expect(blockResult.data.slots_released).toBe(1);

    const { data: pastRow } = await service
      .from('task_assignments')
      .select('is_released')
      .eq('id', pastAssignment!.id)
      .single();

    const { data: futureRow } = await service
      .from('task_assignments')
      .select('is_released')
      .eq('id', futureAssignment!.id)
      .single();

    expect(pastRow?.is_released).toBe(false);
    expect(futureRow?.is_released).toBe(true);

    await client.auth.signOut();
  });
});

describe('EP-15 · unblock task', () => {
  it('returns requires_rescheduling without restoring slots (TC-065)', async () => {
    const { client } = await signInAsRole('admin');

    const unblockResult = await unblockTask(client, taskId, {
      userId: (await client.auth.getUser()).data.user!.id,
      role: 'admin',
    });

    expect(unblockResult.ok).toBe(true);
    if (!unblockResult.ok) {
      await client.auth.signOut();
      return;
    }

    expect(unblockResult.data.status).toBe('in_progress');
    expect(unblockResult.data.requires_rescheduling).toBe(true);

    const schedule = await fetchSchedule(client, TARGET_DATE, { staffId: ASHA_ID });
    const asha = schedule.staff[0];
    const slot = asha.slots.find((row) => row.start === '11:00');

    expect(slot?.state).toBe('available');

    const { data: futureAssignments } = await service
      .from('task_assignments')
      .select('id, date')
      .eq('task_id', taskId)
      .eq('is_released', false)
      .gte('date', TARGET_DATE);

    expect(futureAssignments ?? []).toHaveLength(0);

    await client.auth.signOut();
  });
});

describe('blocked tasks pool', () => {
  it('lists blocked tasks for admins', async () => {
    await service
      .from('tasks')
      .update({
        status: 'blocked',
        blocked_at: new Date().toISOString(),
        blocked_reason: 'Pool visibility test',
      })
      .eq('id', taskId);

    const { client } = await signInAsRole('admin');
    const rows = await fetchBlockedTasks(client);
    const match = rows.find((row) => row.id === taskId);

    expect(match?.blocked_reason).toBe('Pool visibility test');
    expect(match?.staff_name).toBeTruthy();

    await client.auth.signOut();
  });
});
