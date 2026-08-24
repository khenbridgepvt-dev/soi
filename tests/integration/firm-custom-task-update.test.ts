import { afterAll, describe, expect, it } from 'vitest';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { createCustomTask, readApiError } from '@/lib/tasks/create-custom-task';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';
import { loadFirmCustomTaskForAdmin } from '@/lib/tasks/firm-custom-task-guards';
import { updateFirmCustomTask } from '@/lib/tasks/update-firm-custom-task';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();
let targetDate = addDays(todayISODate(), 5);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}
const TARGET_DATE = targetDate;

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];

describe('firm custom task update API (ticket 0121)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }
  });

  it('admin can update firm task name and description after ad-hoc assign', async () => {
    const { client: admin } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Clear emails',
      description: 'Process shared inbox',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '11:00',
      duration_minutes: 60,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);

    const result = await updateFirmCustomTask(admin, created.data.task_id, {
      name: 'Updated title',
      description: 'Revised notes',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toMatchObject({
      id: created.data.task_id,
      name: 'Updated title',
      abbreviation: 'UT',
      description: 'Revised notes',
      case_id: INTERNAL_CASE_ID,
      status: 'not_started',
    });

    const { data: row } = await service
      .from('tasks')
      .select('name, abbreviation, description, status, assigned_to, case_id')
      .eq('id', created.data.task_id)
      .single();

    expect(row?.name).toBe('Updated title');
    expect(row?.abbreviation).toBe('UT');
    expect(row?.description).toBe('Revised notes');
    expect(row?.case_id).toBe(INTERNAL_CASE_ID);

    await admin.auth.signOut();
  });

  it('staff cannot update firm custom task name', async () => {
    const { client: admin } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Staff blocked edit',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '12:00',
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
    const result = await updateFirmCustomTask(staff, created.data.task_id, {
      name: 'Hacked title',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await readApiError(result.response);
      expect(body?.error.code).toBe('FORBIDDEN');
    }

    await staff.auth.signOut();
  });

  it('rejects client case custom tasks', async () => {
    const { client: admin } = await signInAsRole('admin');

    const created = await createCustomTask(admin, VISHNU_CASE_ID, {
      name: 'Client custom',
      abbreviation: 'CC',
      description: 'On Vishnu case',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.id);

    const loaded = await loadFirmCustomTaskForAdmin(admin, created.data.id);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect(loaded.response.status).toBe(403);
    }

    const result = await updateFirmCustomTask(admin, created.data.id, {
      name: 'Should fail',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }

    await admin.auth.signOut();
  });

  it('rejects name validation errors', async () => {
    const { client: admin } = await signInAsRole('admin');

    const created = await createAdhocTaskAssign(admin, {
      name: 'Valid task',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '14:00',
      duration_minutes: 30,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    createdTaskIds.push(created.data.task_id);
    createdAssignmentIds.push(created.data.assignment_id);

    const result = await updateFirmCustomTask(admin, created.data.task_id, {
      name: '   ',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await readApiError(result.response);
      expect(body?.error.code).toBe('VALIDATION_ERROR');
    }

    await admin.auth.signOut();
  });
});
