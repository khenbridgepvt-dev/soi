import { afterAll, describe, expect, it } from 'vitest';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { createCustomTask, readApiError } from '@/lib/tasks/create-custom-task';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';
import { deleteFirmCustomTask } from '@/lib/tasks/delete-firm-custom-task';
import { fetchFirmCustomTaskForEdit } from '@/lib/tasks/fetch-firm-custom-task';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();
let targetDate = addDays(todayISODate(), 7);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}
const TARGET_DATE = targetDate;

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];

describe('firm custom task GET for edit (ticket 0123)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }
  });

  it('admin can load firm task edit payload with assignment', async () => {
    const { client: admin } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Edit load test',
      description: 'Notes for assignee',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '09:30',
      duration_minutes: 45,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);

    const result = await fetchFirmCustomTaskForEdit(admin, created.data.task_id);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toMatchObject({
      id: created.data.task_id,
      name: 'Edit load test',
      description: 'Notes for assignee',
      status: 'not_started',
      case_id: INTERNAL_CASE_ID,
    });
    expect(result.data.assignment).toMatchObject({
      id: created.data.assignment_id,
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '09:30',
      duration_minutes: 45,
    });
    expect(result.data.assignment?.staff_name).toBeTruthy();

    await admin.auth.signOut();
  });

  it('returns not found after firm task is deleted', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Deleted get test',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '13:00',
      duration_minutes: 30,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);

    const deleted = await deleteFirmCustomTask(admin, created.data.task_id, userId);
    expect(deleted.ok).toBe(true);

    const result = await fetchFirmCustomTaskForEdit(admin, created.data.task_id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }

    await admin.auth.signOut();
  });

  it('rejects client case custom tasks', async () => {
    const { client: admin } = await signInAsRole('admin');

    const created = await createCustomTask(admin, VISHNU_CASE_ID, {
      name: 'Client custom get',
      abbreviation: 'CCG',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.id);

    const result = await fetchFirmCustomTaskForEdit(admin, created.data.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await readApiError(result.response);
      expect(body?.error.code).toBe('FORBIDDEN');
    }

    await admin.auth.signOut();
  });
});
