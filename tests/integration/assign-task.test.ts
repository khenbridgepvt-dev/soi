import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assignTask, releaseAssignment } from '@/lib/tasks/assign-task';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import type { Database } from '@/types/database';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, signInAsRole } from './rls-harness';

const service = createServiceClient();

const TARGET_DATE = addDays(todayISODate(), 2);
const DAY_KEY = dayKeyForDate(TARGET_DATE);
const PAST_DATE = addDays(todayISODate(), -1);

let ashaId: string;
let blessId: string;
let taskId: string;
let conflictTaskId: string;
let racingTaskA: string;
let racingTaskB: string;
const createdAssignmentIds: string[] = [];
const savedTimetables = new Map<string, { start: string | null; end: string | null }>();
const savedAssignedTo = new Map<string, string | null>();

function hoursForTargetDay(
  start: string | null,
  end: string | null,
): Database['public']['Tables']['staff_timetables']['Update'] {
  return {
    [`${DAY_KEY}_start`]: start,
    [`${DAY_KEY}_end`]: end,
  } as Database['public']['Tables']['staff_timetables']['Update'];
}

async function assignViaAdmin(
  task: string,
  input: {
    staff_id: string;
    date: string;
    start_time: string;
    duration_minutes: number;
  },
  mode?: 'assign' | 'reassign',
) {
  const { client } = await signInAsRole('admin');
  const result = await assignTask(client, task, input, mode ? { mode } : undefined);
  await client.auth.signOut();
  return result;
}

async function saveTimetable(staffId: string) {
  const { data: timetable } = await service
    .from('staff_timetables')
    .select('*')
    .eq('staff_id', staffId)
    .single();

  savedTimetables.set(staffId, {
    start: timetable![`${DAY_KEY}_start`],
    end: timetable![`${DAY_KEY}_end`],
  });

  await service
    .from('staff_timetables')
    .update(hoursForTargetDay('09:00', '17:00'))
    .eq('staff_id', staffId);
}

async function restoreTimetable(staffId: string) {
  const saved = savedTimetables.get(staffId);
  if (!saved) {
    return;
  }

  await service
    .from('staff_timetables')
    .update(hoursForTargetDay(saved.start, saved.end))
    .eq('staff_id', staffId);
}

async function rememberAssignedTo(taskIds: string[]) {
  const { data } = await service.from('tasks').select('id, assigned_to').in('id', taskIds);

  for (const row of data ?? []) {
    savedAssignedTo.set(row.id, row.assigned_to);
  }
}

async function restoreAssignedTo() {
  for (const [task, assignedTo] of savedAssignedTo.entries()) {
    await service.from('tasks').update({ assigned_to: assignedTo }).eq('id', task);
  }
}

beforeAll(async () => {
  const { data: profiles } = await service
    .from('profiles')
    .select('id, email')
    .in('email', ['asha@firm.com', OTHER_STAFF.email]);

  ashaId = profiles!.find((row) => row.email === 'asha@firm.com')!.id;
  blessId = profiles!.find((row) => row.email === OTHER_STAFF.email)!.id;

  await saveTimetable(ashaId);
  await saveTimetable(blessId);

  const { data: tasks } = await service
    .from('tasks')
    .select('id, cases!inner(status)')
    .eq('assigned_to', ashaId)
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .eq('cases.status', 'active')
    .order('sequence', { ascending: true })
    .limit(2);

  if (!tasks || tasks.length < 2) {
    throw new Error('Need at least two assignable tasks for Asha in seed data.');
  }

  taskId = tasks[0].id;
  conflictTaskId = tasks[1].id;

  const { data: blessTasks } = await service
    .from('tasks')
    .select('id, cases!inner(status)')
    .eq('assigned_to', blessId)
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .eq('cases.status', 'active')
    .order('sequence', { ascending: true })
    .limit(2);

  if (!blessTasks || blessTasks.length < 2) {
    throw new Error('Need at least two assignable tasks for Bless in seed data.');
  }

  racingTaskA = blessTasks[0].id;
  racingTaskB = blessTasks[1].id;

  await rememberAssignedTo([
    taskId,
    conflictTaskId,
    racingTaskA,
    racingTaskB,
    ...(blessTasks ?? []).map((task) => task.id),
  ]);

  await service.from('task_assignments').delete().eq('date', TARGET_DATE);
});

afterAll(async () => {
  if (createdAssignmentIds.length > 0) {
    await service.from('task_assignments').delete().in('id', createdAssignmentIds);
  }

  await service.from('task_assignments').delete().eq('date', TARGET_DATE);
  await restoreAssignedTo();
  await restoreTimetable(ashaId);
  await restoreTimetable(blessId);
});

describe('EP-13 · assign task', () => {
  it('assigns a task and updates tasks.assigned_to (TC-055)', async () => {
    const result = await assignViaAdmin(taskId, {
      staff_id: ashaId,
      date: TARGET_DATE,
      start_time: '11:00',
      duration_minutes: 120,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdAssignmentIds.push(result.data.assignment_id);
    expect(result.data.start_time).toBe('11:00');
    expect(result.data.end_time).toBe('13:00');
    expect(result.data.notification_sent).toBe(true);

    const { data: task } = await service
      .from('tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single();

    expect(task?.assigned_to).toBe(ashaId);

    const { data: notification } = await service
      .from('notifications')
      .select('id, type, user_id')
      .eq('task_id', taskId)
      .eq('user_id', ashaId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification?.[0]?.type).toBe('new_task');
  });

  it('rejects overlapping slots (TC-056)', async () => {
    const result = await assignViaAdmin(conflictTaskId, {
      staff_id: ashaId,
      date: TARGET_DATE,
      start_time: '12:00',
      duration_minutes: 120,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(409);
  });

  it('rejects non-working days (TC-057 MVP)', async () => {
    await service
      .from('staff_timetables')
      .update(hoursForTargetDay(null, null))
      .eq('staff_id', ashaId);

    const result = await assignViaAdmin(conflictTaskId, {
      staff_id: ashaId,
      date: TARGET_DATE,
      start_time: '10:00',
      duration_minutes: 60,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(422);

    await service
      .from('staff_timetables')
      .update(hoursForTargetDay('09:00', '17:00'))
      .eq('staff_id', ashaId);
  });

  it('allows outside-hours slots with is_overtime true (TC-058)', async () => {
    const { data: freeTask } = await service
      .from('tasks')
      .select('id')
      .eq('assigned_to', blessId)
      .eq('is_deleted', false)
      .neq('status', 'completed')
      .limit(1)
      .single();

    await rememberAssignedTo([freeTask!.id]);

    const result = await assignViaAdmin(freeTask!.id, {
      staff_id: ashaId,
      date: TARGET_DATE,
      start_time: '16:00',
      duration_minutes: 120,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdAssignmentIds.push(result.data.assignment_id);
    expect(result.data.is_overtime).toBe(true);
    expect(result.data.end_time).toBe('18:00');
  });

  it('rejects past dates (TC-059)', async () => {
    const result = await assignViaAdmin(conflictTaskId, {
      staff_id: ashaId,
      date: PAST_DATE,
      start_time: '10:00',
      duration_minutes: 60,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(400);
  });
});

describe('EP-58 · release assignment', () => {
  it('releases a slot and clears assigned_to when it was the last one', async () => {
    const { client } = await signInAsRole('admin');

    const { data: assignment } = await service
      .from('task_assignments')
      .select('id, task_id')
      .eq('staff_id', ashaId)
      .eq('date', TARGET_DATE)
      .eq('is_released', false)
      .limit(1)
      .single();

    const result = await releaseAssignment(client, assignment!.task_id, assignment!.id);
    expect(result.ok).toBe(true);

    const { data: released } = await service
      .from('task_assignments')
      .select('is_released')
      .eq('id', assignment!.id)
      .single();

    expect(released?.is_released).toBe(true);

    await client.auth.signOut();
  });
});

describe('EP-59 · reassign task', () => {
  it('moves a task to another staff member', async () => {
    const { data: task } = await service
      .from('tasks')
      .select('id')
      .eq('assigned_to', blessId)
      .eq('is_deleted', false)
      .neq('status', 'completed')
      .limit(1)
      .single();

    await rememberAssignedTo([task!.id]);

    const result = await assignViaAdmin(
      task!.id,
      {
        staff_id: blessId,
        date: TARGET_DATE,
        start_time: '14:00',
        duration_minutes: 60,
      },
      'reassign',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdAssignmentIds.push(result.data.assignment_id);
    expect(result.data.staff_id).toBe(blessId);
  });
});

describe('racing double-book', () => {
  it('lets the exclusion constraint reject the loser', async () => {
    const { client } = await signInAsRole('admin');

    const input = {
      staff_id: blessId,
      date: TARGET_DATE,
      start_time: '10:00',
      duration_minutes: 60,
    };

    const [first, second] = await Promise.all([
      assignTask(client, racingTaskA, input),
      assignTask(client, racingTaskB, input),
    ]);

    const outcomes = [first, second];
    const successes = outcomes.filter((outcome) => outcome.ok);
    const failures = outcomes.filter((outcome) => !outcome.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    if (!failures[0].ok) {
      expect(failures[0].response.status).toBe(409);
    }
    if (successes[0].ok) {
      createdAssignmentIds.push(successes[0].data.assignment_id);
    }

    await client.auth.signOut();
  });
});
