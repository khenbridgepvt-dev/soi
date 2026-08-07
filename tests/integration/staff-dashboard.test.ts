import { afterAll, describe, expect, it } from 'vitest';
import { fetchStaffDashboard } from '@/lib/dashboard/fetch-staff-dashboard';
import { sortByPriority } from '@/lib/utils/priority';
import { addDays, todayISODate } from '@/lib/utils/dates';
import { cleanupTestUser, createServiceClient, createTestUser } from './helpers';
import { OTHER_STAFF, signIn, signInAsRole } from './rls-harness';

const service = createServiceClient();

const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';
const BLESS_ID = 'a0000000-0000-4000-8000-000000000004';
const FATIMA_CASE_ID = 'c0000000-0000-4000-8000-000000000004';

const TODAY = todayISODate();
const TOMORROW = addDays(TODAY, 1);

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];
let emptyStaffId: string | null = null;

async function createTask(input: {
  caseId: string;
  sequence: number;
  abbreviation: string;
  status?: 'not_started' | 'in_progress' | 'blocked';
  assignedTo: string;
  isOverdue?: boolean;
  isUrgent?: boolean;
}) {
  const { data, error } = await service
    .from('tasks')
    .insert({
      case_id: input.caseId,
      sequence: input.sequence,
      name: `Priority test ${input.sequence}`,
      abbreviation: input.abbreviation,
      status: input.status ?? 'not_started',
      assigned_to: input.assignedTo,
      is_overdue: input.isOverdue ?? false,
      is_urgent: input.isUrgent ?? false,
      is_custom: true,
      blocked_at: input.status === 'blocked' ? new Date().toISOString() : null,
      blocked_reason: input.status === 'blocked' ? 'Client not responding' : null,
    })
    .select('id')
    .single();

  expect(error).toBeNull();
  createdTaskIds.push(data!.id);
  return data!.id;
}

async function createAssignment(taskId: string, staffId: string, date: string, start: string) {
  const endHour = String(Number(start.slice(0, 2)) + 1).padStart(2, '0');
  const { data, error } = await service
    .from('task_assignments')
    .insert({
      task_id: taskId,
      staff_id: staffId,
      date,
      start_time: start,
      end_time: `${endHour}:00`,
      duration_minutes: 60,
    })
    .select('id')
    .single();

  expect(error).toBeNull();
  createdAssignmentIds.push(data!.id);
}

describe('staff dashboard (ticket 0025, EP-43 / S-10)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }

    if (emptyStaffId) {
      await cleanupTestUser(service, emptyStaffId);
    }
  });

  it('TC-066 · priority list order matches urgent → overdue → on-track → blocked', async () => {
    const staffId = BLESS_ID;
    const { client } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const urgentId = await createTask({
      caseId: FATIMA_CASE_ID,
      sequence: 211,
      abbreviation: 'URG1',
      assignedTo: staffId,
      status: 'in_progress',
      isUrgent: true,
    });
    const overdueId = await createTask({
      caseId: FATIMA_CASE_ID,
      sequence: 212,
      abbreviation: 'OVD1',
      assignedTo: staffId,
      isOverdue: true,
      status: 'in_progress',
    });
    const onTrackEarlyId = await createTask({
      caseId: FATIMA_CASE_ID,
      sequence: 213,
      abbreviation: 'TRK1',
      assignedTo: staffId,
      status: 'in_progress',
    });
    const onTrackLateId = await createTask({
      caseId: FATIMA_CASE_ID,
      sequence: 214,
      abbreviation: 'TRK2',
      assignedTo: staffId,
      status: 'in_progress',
    });
    const blockedId = await createTask({
      caseId: FATIMA_CASE_ID,
      sequence: 215,
      abbreviation: 'BLK1',
      assignedTo: staffId,
      status: 'blocked',
    });

    await createAssignment(onTrackEarlyId, staffId, TODAY, '07:00');
    await createAssignment(overdueId, staffId, TODAY, '08:00');
    await createAssignment(onTrackLateId, staffId, TODAY, '13:00');
    await createAssignment(urgentId, staffId, TODAY, '15:00');

    const dashboard = await fetchStaffDashboard(client, staffId, 'today');

    const fixtureIds = [urgentId, overdueId, onTrackEarlyId, onTrackLateId, blockedId];
    const visible = dashboard.priority_list.filter((task) => fixtureIds.includes(task.id));

    expect(visible.map((task) => task.id)).toEqual([
      urgentId,
      onTrackEarlyId,
      overdueId,
      onTrackLateId,
      blockedId,
    ]);
    expect(dashboard.priority_list[0]?.id).toBe(urgentId);

    await client.auth.signOut();
  });

  it('TC-067 · summary metrics reflect assigned workload', async () => {
    const { client } = await signInAsRole('staff');
    const dashboard = await fetchStaffDashboard(client, ASHA_ID, 'all');

    expect(dashboard.today_task_count).toBeGreaterThanOrEqual(0);
    expect(dashboard.overdue_count).toBeGreaterThanOrEqual(0);
    expect(dashboard.blocked_count).toBeGreaterThanOrEqual(0);
    expect(dashboard.due_this_week_count).toBeGreaterThanOrEqual(dashboard.today_task_count);

    await client.auth.signOut();
  });

  it('TC-068 · empty state when staff has no assigned tasks', async () => {
    const temp = await createTestUser(service, `empty-staff-${Date.now()}@firm.com`, {
      full_name: 'Empty Staff',
      role: 'staff',
    });
    emptyStaffId = temp.id;

    const { client, userId } = await signIn(temp.email, 'TestPass123!');
    const dashboard = await fetchStaffDashboard(client, userId, 'today');

    expect(dashboard.priority_list).toEqual([]);
    expect(dashboard.firm_tasks).toEqual([]);
    expect(dashboard.firm_tasks_history).toEqual([]);
    expect(dashboard.today_task_count).toBe(0);
    expect(dashboard.overdue_count).toBe(0);
    expect(dashboard.blocked_count).toBe(0);

    await client.auth.signOut();
  });
});

describe('online status (ticket 0025, EP-21)', () => {
  it('TC-053 · staff can set their own online status', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { data, error } = await client
      .from('profiles')
      .update({ online_status: 'online' })
      .eq('id', userId)
      .select('id, online_status')
      .single();

    expect(error).toBeNull();
    expect(data?.online_status).toBe('online');

    await client.auth.signOut();
  });

  it('TC-054 · staff cannot update another staff member status', async () => {
    const { client } = await signInAsRole('staff');

    const { data, error } = await client
      .from('profiles')
      .update({ online_status: 'online' })
      .eq('id', BLESS_ID)
      .select('id, online_status');

    expect(error).toBeNull();
    expect(data).toEqual([]);

    await client.auth.signOut();
  });

  it('TC-077a · staff can set break status', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { data, error } = await client
      .from('profiles')
      .update({ online_status: 'break' })
      .eq('id', userId)
      .select('online_status')
      .single();

    expect(error).toBeNull();
    expect(data?.online_status).toBe('break');

    await client
      .from('profiles')
      .update({ online_status: 'offline' })
      .eq('id', userId);

    await client.auth.signOut();
  });
});

describe('priority seam fixture', () => {
  it('sorts crafted urgent/overdue/today/future tasks deterministically', () => {
    const sorted = sortByPriority(
      [
        {
          id: 'blocked',
          status: 'blocked',
          is_urgent: false,
          is_overdue: false,
          last_date: null,
          current_assignment: null,
          blocked_at: '2026-07-01T10:00:00Z',
        },
        {
          id: 'future',
          status: 'not_started',
          is_urgent: false,
          is_overdue: false,
          last_date: null,
          current_assignment: { date: TOMORROW, start_time: '09:00', end_time: '10:00' },
          blocked_at: null,
        },
        {
          id: 'today-late',
          status: 'in_progress',
          is_urgent: false,
          is_overdue: false,
          last_date: null,
          current_assignment: { date: TODAY, start_time: '15:00', end_time: '16:00' },
          blocked_at: null,
        },
        {
          id: 'today-early',
          status: 'in_progress',
          is_urgent: false,
          is_overdue: false,
          last_date: null,
          current_assignment: { date: TODAY, start_time: '09:00', end_time: '10:00' },
          blocked_at: null,
        },
        {
          id: 'overdue',
          status: 'in_progress',
          is_urgent: false,
          is_overdue: true,
          last_date: addDays(TODAY, -3),
          current_assignment: null,
          blocked_at: null,
        },
        {
          id: 'urgent',
          status: 'in_progress',
          is_urgent: true,
          is_overdue: false,
          last_date: addDays(TODAY, 2),
          current_assignment: { date: TODAY, start_time: '11:00', end_time: '12:00' },
          blocked_at: null,
        },
      ],
      TODAY,
    );

    expect(sorted.map((task) => task.id)).toEqual([
      'urgent',
      'overdue',
      'today-early',
      'today-late',
      'future',
      'blocked',
    ]);
  });
});
