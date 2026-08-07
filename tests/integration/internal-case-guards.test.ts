import { afterAll, describe, expect, it } from 'vitest';
import { fetchCaseDetail } from '@/lib/cases/fetch-case-detail';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';
import { fetchStaffDashboard } from '@/lib/dashboard/fetch-staff-dashboard';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

let targetDate = addDays(todayISODate(), 5);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];

describe('internal case guards (ticket 0047)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }
  });

  it('seeds FIRM-GENERAL via migration 00044 after db reset', async () => {
    const { data, error } = await service
      .from('cases')
      .select('id, reference, is_internal, status')
      .eq('id', INTERNAL_CASE_ID)
      .single();

    expect(error).toBeNull();
    expect(data?.reference).toBe('FIRM-GENERAL');
    expect(data?.is_internal).toBe(true);
    expect(data?.status).toBe('active');
  });

  it('returns null from fetchCaseDetail for internal case (404 at API)', async () => {
    const { client } = await signInAsRole('admin');

    const detail = await fetchCaseDetail(client, INTERNAL_CASE_ID, 'admin');
    expect(detail).toBeNull();

    await client.auth.signOut();
  });

  it('places firm tasks on staff dashboard without client case fields in priority list', async () => {
    const { client: admin } = await signInAsRole('admin');

    const result = await createAdhocTaskAssign(admin, {
      name: 'Clear emails',
      description: 'Process shared inbox',
      staff_id: ASHA_ID,
      date: targetDate,
      start_time: '11:00',
      duration_minutes: 60,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdTaskIds.push(result.data.task_id);
    createdAssignmentIds.push(result.data.assignment_id);

    await admin.auth.signOut();

    const { client: staff } = await signInAsRole('staff');
    const dashboard = await fetchStaffDashboard(staff, ASHA_ID, 'all');

    expect(dashboard.priority_list.some((task) => task.case_is_internal)).toBe(false);
    expect(dashboard.firm_tasks.some((task) => task.name === 'Clear emails')).toBe(true);

    const firmTask = dashboard.firm_tasks.find((task) => task.id === result.data.task_id);
    expect(firmTask?.case_reference).toBe('FIRM-GENERAL');
    expect(firmTask?.description).toContain('Process shared inbox');

    await staff.auth.signOut();
  });

  it('allows not_started → completed for firm task and keeps internal case active', async () => {
    const { client: staff } = await signInAsRole('staff');

    const { data: task } = await service
      .from('tasks')
      .select('id, status')
      .eq('case_id', INTERNAL_CASE_ID)
      .eq('assigned_to', ASHA_ID)
      .eq('name', 'Clear emails')
      .neq('status', 'completed')
      .maybeSingle();

    expect(task?.id).toBeTruthy();
    if (!task?.id) {
      return;
    }

    const { data, error } = await staff.rpc('update_task_status', {
      p_task_id: task.id,
      p_new_status: 'completed',
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({ status: 'completed' });

    const { data: internalCase } = await service
      .from('cases')
      .select('status')
      .eq('id', INTERNAL_CASE_ID)
      .single();

    expect(internalCase?.status).toBe('active');

    const dashboard = await fetchStaffDashboard(staff, ASHA_ID, 'all');
    expect(dashboard.firm_tasks.some((row) => row.id === task.id)).toBe(false);
    expect(dashboard.firm_tasks_history.some((row) => row.id === task.id)).toBe(true);

    await staff.auth.signOut();
  });
});
