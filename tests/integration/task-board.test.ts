import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchAdminDashboard } from '@/lib/dashboard/fetch-admin-dashboard';
import { fetchTaskBoard } from '@/lib/task-board/fetch-task-board';
import {
  formatBoardAppointment,
  formatBoardClientName,
  formatBoardLastDate,
} from '@/lib/task-board/format-card';
import { createServiceClient, ensureKimLeadCase } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';
const BLESS_ID = 'a0000000-0000-4000-8000-000000000004';

describe('task board (ticket 0024, S-03 / EP-42)', () => {
  beforeAll(async () => {
    await ensureKimLeadCase(service);
  });

  afterAll(async () => {
    await service
      .from('cases')
      .update({ is_urgent: true })
      .eq('id', VISHNU_CASE_ID);
  });

  it('TC-045 · columns per staff + unassigned placement', async () => {
    const { client } = await signInAsRole('admin');

    const board = await fetchTaskBoard(client);

    expect(board.columns.length).toBeGreaterThanOrEqual(3);
    expect(board.columns.map((column) => column.full_name)).toContain('Asha Staff');

    const unassigned = board.tasks.filter((task) => !task.assigned_to);
    expect(unassigned.length).toBeGreaterThan(0);
    expect(board.unassigned_count).toBe(unassigned.length);

    for (const task of board.tasks) {
      if (!task.assigned_to) {
        continue;
      }

      expect(board.columns.some((column) => column.id === task.assigned_to)).toBe(true);
    }

    await client.auth.signOut();
  });

  it('TC-046 · card content fields and token mapping', async () => {
    const { client } = await signInAsRole('admin');
    const board = await fetchTaskBoard(client);

    const vishnuTask = board.tasks.find((task) => task.case_id === VISHNU_CASE_ID);
    expect(vishnuTask).toBeTruthy();

    expect(vishnuTask?.abbreviation).toBeTruthy();
    expect(formatBoardClientName(
      vishnuTask!.client_first_name,
      vishnuTask!.client_last_name,
      vishnuTask!.dependant_count,
    )).toBe('Vishnu Patel +1');
    expect(formatBoardAppointment(vishnuTask?.appointment_date ?? null)).toMatch(/^appt /);
    expect(formatBoardLastDate(vishnuTask?.last_date ?? null)).toMatch(/^last date /);
    expect(vishnuTask?.notes ?? vishnuTask?.case_notes).toBeTruthy();
    expect(['on-track', 'urgent', 'approaching', 'overdue', 'standard', 'blocked']).toContain(
      vishnuTask?.token,
    );

    await client.auth.signOut();
  });

  it('TC-048 · urgent case highlights active tasks only', async () => {
    const { client } = await signInAsRole('admin');

    await client.from('cases').update({ is_urgent: true }).eq('id', VISHNU_CASE_ID);

    const urgentBoard = await fetchTaskBoard(client);
    const activeVishnu = urgentBoard.tasks.filter(
      (task) =>
        task.case_id === VISHNU_CASE_ID &&
        (task.status === 'not_started' || task.status === 'in_progress'),
    );

    expect(activeVishnu.length).toBeGreaterThan(0);
    expect(activeVishnu.every((task) => task.token === 'urgent')).toBe(true);

    await client.from('cases').update({ is_urgent: false }).eq('id', VISHNU_CASE_ID);

    const normalBoard = await fetchTaskBoard(client);
    const after = normalBoard.tasks.find(
      (task) => task.case_id === VISHNU_CASE_ID && task.sequence === 8,
    );

    expect(after?.token).not.toBe('urgent');

    await client.auth.signOut();
  });

  it('TC-049 · blocked task uses blocked token', async () => {
    const { client } = await signInAsRole('admin');
    const board = await fetchTaskBoard(client);

    const blocked = board.tasks.find((task) => task.status === 'blocked');
    expect(blocked).toBeTruthy();
    expect(blocked?.token).toBe('blocked');

    await client.auth.signOut();
  });

  it('TC-050 · card navigation target includes case and task id', async () => {
    const { client } = await signInAsRole('admin');
    const board = await fetchTaskBoard(client);
    const sample = board.tasks[0];

    expect(sample).toBeTruthy();
    expect(`/cases/${sample.case_id}?task=${sample.id}`).toMatch(
      /^\/cases\/[0-9a-f-]+\?task=[0-9a-f-]+$/,
    );

    await client.auth.signOut();
  });

  it('loads board data in under 3 seconds with 100 active tasks', async () => {
    const { client } = await signInAsRole('admin');

    const { data: templateCase } = await service
      .from('cases')
      .select('application_type_id, created_by')
      .eq('id', VISHNU_CASE_ID)
      .single();

    const createdCaseIds: string[] = [];

    for (let caseIndex = 0; caseIndex < 8; caseIndex += 1) {
      const { data: createdCase, error: caseError } = await service
        .from('cases')
        .insert({
          client_first_name: 'Load',
          client_last_name: `Test${caseIndex}`,
          application_type_id: templateCase!.application_type_id,
          status: 'active',
          created_by: templateCase!.created_by,
          accepted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      expect(caseError).toBeNull();
      createdCaseIds.push(createdCase!.id);

      const rows = Array.from({ length: 13 }, (_, sequenceIndex) => ({
        case_id: createdCase!.id,
        sequence: sequenceIndex + 1,
        name: `Load task ${caseIndex}-${sequenceIndex}`,
        abbreviation: `L${caseIndex}${sequenceIndex}`,
        status: 'not_started' as const,
        assigned_to: sequenceIndex % 2 === 0 ? ASHA_ID : BLESS_ID,
        is_custom: false,
      }));

      const { error: taskError } = await service.from('tasks').insert(rows);
      expect(taskError).toBeNull();
    }

    const started = performance.now();
    const board = await fetchTaskBoard(client);
    const elapsed = performance.now() - started;

    expect(board.tasks.length).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(3000);

    await service.from('cases').delete().in('id', createdCaseIds);
    await client.auth.signOut();
  });
});

describe('admin dashboard (ticket 0024, S-02 / EP-42)', () => {
  it('TC-063 · returns metric cards, pending leads, team status, and schedule summary', async () => {
    const { client } = await signInAsRole('admin');
    const dashboard = await fetchAdminDashboard(client);

    expect(dashboard.active_cases).toBeGreaterThan(0);
    expect(dashboard.urgent_cases).toBeGreaterThanOrEqual(0);
    expect(dashboard.blocked_tasks).toBeGreaterThanOrEqual(0);
    expect(dashboard.overdue_tasks).toBeGreaterThanOrEqual(0);
    expect(dashboard.pending_leads.length).toBeGreaterThan(0);
    expect(dashboard.team_status.some((member) => member.id === ASHA_ID)).toBe(true);
    expect(dashboard.schedule_summary.some((row) => row.staff_id === ASHA_ID)).toBe(true);
    expect(
      dashboard.schedule_summary.every(
        (row) => row.total_hours >= 0 && row.booked_hours >= 0,
      ),
    ).toBe(true);

    await client.auth.signOut();
  });
});
