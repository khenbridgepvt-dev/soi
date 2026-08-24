import { afterAll, describe, expect, it } from 'vitest';
import { createCustomTask, readApiError } from '@/lib/tasks/create-custom-task';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';
import { deleteFirmCustomTask } from '@/lib/tasks/delete-firm-custom-task';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();
let targetDate = addDays(todayISODate(), 6);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}
const TARGET_DATE = targetDate;

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];

describe('firm custom task delete API (ticket 0122)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }
  });

  it('admin soft-deletes firm task, releases assignments, and removes from schedule', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Delete me',
      description: 'Temporary firm work',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '10:00',
      duration_minutes: 60,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);

    const beforeSchedule = await fetchSchedule(admin, TARGET_DATE, { staffId: ASHA_ID });
    const beforeAssignment = beforeSchedule.staff[0]?.assignments.find(
      (row) => row.id === created.data.assignment_id,
    );
    expect(beforeAssignment).toBeTruthy();

    const result = await deleteFirmCustomTask(admin, created.data.task_id, userId);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toEqual({
      id: created.data.task_id,
      is_deleted: true,
      released_assignment_ids: [created.data.assignment_id],
    });

    const { data: task } = await service
      .from('tasks')
      .select('is_deleted, deleted_at, deleted_by, assigned_to')
      .eq('id', created.data.task_id)
      .single();

    expect(task?.is_deleted).toBe(true);
    expect(task?.deleted_at).toBeTruthy();
    expect(task?.deleted_by).toBe(userId);
    expect(task?.assigned_to).toBeNull();

    const { data: assignment } = await service
      .from('task_assignments')
      .select('is_released, released_at')
      .eq('id', created.data.assignment_id)
      .single();

    expect(assignment?.is_released).toBe(true);
    expect(assignment?.released_at).toBeTruthy();

    const afterSchedule = await fetchSchedule(admin, TARGET_DATE, { staffId: ASHA_ID });
    const afterAssignment = afterSchedule.staff[0]?.assignments.find(
      (row) => row.id === created.data.assignment_id,
    );
    expect(afterAssignment).toBeUndefined();

    await admin.auth.signOut();
  });

  it('staff cannot delete firm custom tasks', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Staff blocked delete',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '11:30',
      duration_minutes: 30,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);
    await admin.auth.signOut();

    const { client: staff } = await signInAsRole('staff');
    const result = await deleteFirmCustomTask(staff, created.data.task_id, userId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await readApiError(result.response);
      expect(body?.error.code).toBe('FORBIDDEN');
    }

    await staff.auth.signOut();
  });

  it('rejects client case custom tasks', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const created = await createCustomTask(admin, VISHNU_CASE_ID, {
      name: 'Client custom delete',
      abbreviation: 'CCD',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.id);

    const result = await deleteFirmCustomTask(admin, created.data.id, userId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }

    await admin.auth.signOut();
  });

  it('returns not found on second delete', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Delete twice',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '15:00',
      duration_minutes: 30,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);

    const first = await deleteFirmCustomTask(admin, created.data.task_id, userId);
    expect(first.ok).toBe(true);

    const second = await deleteFirmCustomTask(admin, created.data.task_id, userId);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.response.status).toBe(404);
      const body = await readApiError(second.response);
      expect(body?.error.code).toBe('NOT_FOUND');
    }

    await admin.auth.signOut();
  });
});
