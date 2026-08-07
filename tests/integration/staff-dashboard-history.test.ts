import { afterAll, describe, expect, it } from 'vitest';
import { fetchStaffDashboardHistory } from '@/lib/dashboard/fetch-staff-dashboard-history';
import { fetchStaffDashboard } from '@/lib/dashboard/fetch-staff-dashboard';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';
const FATIMA_CASE_ID = 'c0000000-0000-4000-8000-000000000004';

let targetDate = addDays(todayISODate(), 5);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];

describe('staff dashboard history (ticket 0051)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }
  });

  it('does not load history on initial dashboard payload', async () => {
    const { client } = await signInAsRole('staff');
    const dashboard = await fetchStaffDashboard(client, ASHA_ID, 'today');

    expect(dashboard.firm_tasks_history).toEqual([]);

    await client.auth.signOut();
  });

  it('returns completed firm and client tasks', async () => {
    const { client: admin } = await signInAsRole('admin');

    const firmResult = await createAdhocTaskAssign(admin, {
      name: 'Archive inbox',
      staff_id: ASHA_ID,
      date: targetDate,
      start_time: '09:00',
      duration_minutes: 60,
    });

    expect(firmResult.ok).toBe(true);
    if (!firmResult.ok) {
      return;
    }

    createdTaskIds.push(firmResult.data.task_id);
    createdAssignmentIds.push(firmResult.data.assignment_id);

    const { data: clientTask, error: clientTaskError } = await service
      .from('tasks')
      .insert({
        case_id: FATIMA_CASE_ID,
        sequence: 301,
        name: 'History client task',
        abbreviation: 'HCT',
        status: 'not_started',
        assigned_to: ASHA_ID,
        is_custom: true,
      })
      .select('id')
      .single();

    expect(clientTaskError).toBeNull();
    createdTaskIds.push(clientTask!.id);

    await service
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: ASHA_ID })
      .in('id', [firmResult.data.task_id, clientTask!.id]);

    await admin.auth.signOut();

    const { client: staff } = await signInAsRole('staff');
    const history = await fetchStaffDashboardHistory(staff, ASHA_ID, { limit: 10 });

    expect(history.items.some((task) => task.name === 'Archive inbox' && task.case_is_internal)).toBe(
      true,
    );
    expect(
      history.items.some(
        (task) => task.name === 'History client task' && !task.case_is_internal,
      ),
    ).toBe(true);

    await staff.auth.signOut();
  });

  it('paginates completed tasks with limit 10', async () => {
    const completedAt = new Date().toISOString();
    const rows = Array.from({ length: 11 }, (_, index) => ({
      case_id: INTERNAL_CASE_ID,
      sequence: 400 + index,
      name: `History page ${index}`,
      abbreviation: `HP${index}`,
      status: 'completed' as const,
      assigned_to: ASHA_ID,
      is_custom: false,
      completed_at: completedAt,
      completed_by: ASHA_ID,
    }));

    const { data: inserted, error } = await service.from('tasks').insert(rows).select('id');
    expect(error).toBeNull();
    createdTaskIds.push(...(inserted ?? []).map((row) => row.id));

    const { client } = await signInAsRole('staff');

    const firstPage = await fetchStaffDashboardHistory(client, ASHA_ID, { limit: 10 });
    expect(firstPage.items).toHaveLength(10);
    expect(firstPage.has_more).toBe(true);
    expect(firstPage.next_cursor).toBeTruthy();

    const secondPage = await fetchStaffDashboardHistory(client, ASHA_ID, {
      limit: 10,
      cursor: firstPage.next_cursor,
    });

    expect(secondPage.items.length).toBeGreaterThanOrEqual(1);
    expect(firstPage.items.every((task) => !secondPage.items.some((row) => row.id === task.id))).toBe(
      true,
    );

    await client.auth.signOut();
  });
});
