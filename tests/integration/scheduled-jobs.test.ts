import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { duAlertSeverity } from '@/lib/scheduled/du-escalation';
import { runDetectOverdue } from '@/lib/scheduled/detect-overdue';
import { runDuAlerts } from '@/lib/scheduled/du-alerts';
import { todayISODate } from '@/lib/utils/dates';
import type { Database } from '@/types/database';
import { createServiceClient } from './helpers';

const service = createServiceClient();

const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';
const FATIMA_CASE_ID = 'c0000000-0000-4000-8000-000000000004';
const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const OVERDUE_SEQUENCE = 4;
const SEED_APPOINTMENT_DATE = '2026-07-19T15:30:00+00';
const TEST_APPOINTMENT_DATE = '2026-07-22T10:00:00.000Z';

let overdueTaskId: string;
let duTask12Id: string;
const createdAssignmentIds: string[] = [];

let savedOverdueTask: {
  status: Database['public']['Enums']['task_status'];
  is_overdue: boolean;
};
let savedDuTasks: Array<{
  sequence: number;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
}>;

beforeAll(async () => {
  const { data: overdueTask } = await service
    .from('tasks')
    .select('id, status, is_overdue')
    .eq('case_id', FATIMA_CASE_ID)
    .eq('sequence', OVERDUE_SEQUENCE)
    .single();

  overdueTaskId = overdueTask!.id;
  savedOverdueTask = {
    status: overdueTask!.status,
    is_overdue: overdueTask!.is_overdue,
  };

  await service
    .from('tasks')
    .update({ is_overdue: false, status: 'in_progress' })
    .eq('id', overdueTaskId);

  const today = todayISODate();
  const { data: assignment, error } = await service
    .from('task_assignments')
    .insert({
      task_id: overdueTaskId,
      staff_id: ASHA_ID,
      date: today,
      start_time: '00:00',
      end_time: '00:30',
      duration_minutes: 30,
    })
    .select('id')
    .single();

  expect(error).toBeNull();
  createdAssignmentIds.push(assignment!.id);

  const { data: duTask } = await service
    .from('tasks')
    .select('id')
    .eq('case_id', VISHNU_CASE_ID)
    .eq('sequence', 12)
    .single();

  duTask12Id = duTask!.id;

  const { data: duTasks } = await service
    .from('tasks')
    .select('sequence, status, assigned_to')
    .eq('case_id', VISHNU_CASE_ID)
    .in('sequence', [12, 13]);

  savedDuTasks = (duTasks ?? []).map((row) => ({
    sequence: row.sequence,
    status: row.status,
    assigned_to: row.assigned_to,
  }));

  await service
    .from('cases')
    .update({ appointment_date: TEST_APPOINTMENT_DATE })
    .eq('id', VISHNU_CASE_ID);

  await service
    .from('tasks')
    .update({ status: 'in_progress', assigned_to: ASHA_ID })
    .eq('case_id', VISHNU_CASE_ID)
    .in('sequence', [12, 13]);
});

afterAll(async () => {
  if (createdAssignmentIds.length > 0) {
    await service.from('task_assignments').delete().in('id', createdAssignmentIds);
  }

  await service
    .from('tasks')
    .update({
      status: savedOverdueTask.status,
      is_overdue: savedOverdueTask.is_overdue,
    })
    .eq('id', overdueTaskId);

  await service
    .from('notifications')
    .delete()
    .eq('task_id', overdueTaskId)
    .eq('type', 'task_overdue');

  await service
    .from('notifications')
    .delete()
    .in('task_id', [duTask12Id])
    .eq('type', 'du_alert');

  await service
    .from('cases')
    .update({ appointment_date: SEED_APPOINTMENT_DATE })
    .eq('id', VISHNU_CASE_ID);

  for (const row of savedDuTasks) {
    await service
      .from('tasks')
      .update({ status: row.status, assigned_to: row.assigned_to })
      .eq('case_id', VISHNU_CASE_ID)
      .eq('sequence', row.sequence);
  }
});

describe('detect-overdue (ticket 0028, US-7.3)', () => {
  it('TC-074 · flags overdue tasks and notifies the assignee once', async () => {
    const first = await runDetectOverdue(service, new Date(`${todayISODate()}T12:00:00.000Z`));
    expect(first.flagged).toBeGreaterThanOrEqual(1);
    expect(first.notifications_sent).toBeGreaterThanOrEqual(1);

    const { data: task } = await service
      .from('tasks')
      .select('is_overdue')
      .eq('id', overdueTaskId)
      .single();

    expect(task?.is_overdue).toBe(true);

    const { count } = await service
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', overdueTaskId)
      .eq('type', 'task_overdue')
      .eq('user_id', ASHA_ID);

    expect(count).toBe(1);

    const second = await runDetectOverdue(service, new Date(`${todayISODate()}T12:15:00.000Z`));
    expect(second.flagged).toBe(0);
    expect(second.notifications_sent).toBe(0);

    const { count: afterRerun } = await service
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', overdueTaskId)
      .eq('type', 'task_overdue');

    expect(afterRerun).toBe(1);
  });
});

describe('du-alerts (ticket 0028, ADR-0007)', () => {
  it('walks the DU ladder day-by-day for an appointment 5 working days out', () => {
    const appointment = '2026-07-22';
    expect(duAlertSeverity(appointment, '2026-07-15')).toBeNull();
    expect(duAlertSeverity(appointment, '2026-07-16')).toBeNull();
    expect(duAlertSeverity(appointment, '2026-07-17')).toBeNull();
    expect(duAlertSeverity(appointment, '2026-07-18')).toBe('warning');
    expect(duAlertSeverity(appointment, '2026-07-21')).toBe('critical');
    expect(duAlertSeverity(appointment, '2026-07-22')).toBe('critical');
  });

  it('sends DU alerts once per day and escalates severity', async () => {
    const warningDay = '2026-07-18';
    const criticalDay = '2026-07-21';

    const warningRun = await runDuAlerts(service, warningDay);
    expect(warningRun.alerts_sent).toBeGreaterThan(0);

    const warningAgain = await runDuAlerts(service, warningDay);
    expect(warningAgain.alerts_sent).toBe(0);

    const { data: warningRows } = await service
      .from('notifications')
      .select('id, is_urgent, payload')
      .eq('task_id', duTask12Id)
      .eq('type', 'du_alert');

    expect((warningRows ?? []).length).toBeGreaterThan(0);
    expect(warningRows?.some((row) => row.is_urgent === false)).toBe(true);

    const criticalRun = await runDuAlerts(service, criticalDay);
    expect(criticalRun.alerts_sent).toBeGreaterThan(0);

    const { data: allRows } = await service
      .from('notifications')
      .select('id, is_urgent, payload')
      .eq('task_id', duTask12Id)
      .eq('type', 'du_alert');

    expect(allRows?.some((row) => row.is_urgent === true)).toBe(true);

    const criticalAgain = await runDuAlerts(service, criticalDay);
    expect(criticalAgain.alerts_sent).toBe(0);
  });
});
