import { afterAll, describe, expect, it } from 'vitest';
import { assignTask } from '@/lib/tasks/assign-task';
import { createCustomTask, readApiError } from '@/lib/tasks/create-custom-task';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const LEAD_CASE_ID = 'c0000000-0000-4000-8000-000000000003';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();
let targetDate = addDays(todayISODate(), 3);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}
const TARGET_DATE = targetDate;
const createdCustomTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];

describe('custom task assign from calendar flow (ticket 0034)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdCustomTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdCustomTaskIds);
    }
  });

  it('creates a custom task on an active case and assigns it to a slot', async () => {
    const { client: admin } = await signInAsRole('admin');

    const createResult = await createCustomTask(admin, VISHNU_CASE_ID, {
      name: 'Calendar Custom Task',
      abbreviation: 'CCT',
      description: 'Created from schedule slot flow',
    });

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) {
      return;
    }

    createdCustomTaskIds.push(createResult.data.id);

    const assignResult = await assignTask(admin, createResult.data.id, {
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '14:00',
      duration_minutes: 60,
    });

    expect(assignResult.ok).toBe(true);
    if (assignResult.ok) {
      createdAssignmentIds.push(assignResult.data.assignment_id);
      expect(assignResult.data.staff_id).toBe(ASHA_ID);
    }

    const { data: assignment } = await service
      .from('task_assignments')
      .select('id, task_id, staff_id, date, start_time')
      .eq('task_id', createResult.data.id)
      .eq('is_released', false)
      .maybeSingle();

    expect(assignment?.staff_id).toBe(ASHA_ID);
    expect(assignment?.date).toBe(TARGET_DATE);
    expect(assignment?.start_time).toBe('14:00:00');

    await admin.auth.signOut();
  });

  it('rejects custom task creation on a lead_pending case', async () => {
    const { client: admin } = await signInAsRole('admin');

    const result = await createCustomTask(admin, LEAD_CASE_ID, {
      name: 'Lead Custom',
      abbreviation: 'LC',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await readApiError(result.response);
      expect(body?.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(body?.error?.message).toContain('active cases');
    }

    await admin.auth.signOut();
  });

  it('rejects a sixth custom task on a case', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { count: existingCount } = await admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', VISHNU_CASE_ID)
      .eq('is_custom', true)
      .eq('is_deleted', false);

    const toCreate = 5 - (existingCount ?? 0);
    for (let i = 0; i < toCreate; i++) {
      const { data: maxRow } = await admin
        .from('tasks')
        .select('sequence')
        .eq('case_id', VISHNU_CASE_ID)
        .eq('is_deleted', false)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data } = await admin
        .from('tasks')
        .insert({
          case_id: VISHNU_CASE_ID,
          sequence: (maxRow?.sequence ?? 0) + 1,
          name: `Limit Fill ${i}`,
          abbreviation: `L${i}`,
          is_custom: true,
          status: 'not_started',
        })
        .select('id')
        .single();

      if (data?.id) {
        createdCustomTaskIds.push(data.id);
      }
    }

    const result = await createCustomTask(admin, VISHNU_CASE_ID, {
      name: 'Too Many',
      abbreviation: 'TM',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await readApiError(result.response);
      expect(body?.error?.message).toContain('Maximum of 5 custom tasks');
    }

    await admin.auth.signOut();
  });
});
