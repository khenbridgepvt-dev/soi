import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchCaseList } from '@/lib/cases/fetch-case-list';
import {
  INTERNAL_CASE_ID,
  INTERNAL_CASE_REFERENCE,
} from '@/lib/cases/internal-case';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { fetchAssignableCasesGrouped } from '@/lib/tasks/fetch-assignable-tasks';
import { fetchGlobalSearch } from '@/lib/search/fetch-global-search';
import { addDays, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const TARGET_DATE = addDays(todayISODate(), 2);

let internalTaskId: string;
let assignmentId: string;

describe('internal case model (ticket 0043, ADR-0019)', () => {
  beforeAll(async () => {
    const { data: internalCase, error: caseError } = await service
      .from('cases')
      .select('id, reference, is_internal')
      .eq('id', INTERNAL_CASE_ID)
      .single();

    if (caseError || !internalCase) {
      throw caseError ?? new Error('Internal case seed missing after migration 00043.');
    }

    expect(internalCase.reference).toBe(INTERNAL_CASE_REFERENCE);
    expect(internalCase.is_internal).toBe(true);

    const { data: task, error: taskError } = await service
      .from('tasks')
      .insert({
        case_id: INTERNAL_CASE_ID,
        name: 'Clear emails',
        abbreviation: 'EMAIL',
        sequence: 1,
        status: 'not_started',
        assigned_to: ASHA_ID,
      })
      .select('id')
      .single();

    if (taskError || !task) {
      throw taskError ?? new Error('Failed to seed internal ad-hoc task.');
    }

    internalTaskId = task.id;

    const { data: assignment, error: assignmentError } = await service
      .from('task_assignments')
      .insert({
        task_id: internalTaskId,
        staff_id: ASHA_ID,
        date: TARGET_DATE,
        start_time: '10:00',
        end_time: '11:00',
        duration_minutes: 60,
      })
      .select('id')
      .single();

    if (assignmentError || !assignment) {
      throw assignmentError ?? new Error('Failed to seed internal assignment.');
    }

    assignmentId = assignment.id;
  });

  afterAll(async () => {
    if (assignmentId) {
      await service.from('task_assignments').delete().eq('id', assignmentId);
    }
    if (internalTaskId) {
      await service.from('tasks').delete().eq('id', internalTaskId);
    }
  });

  it('excludes internal case from case list API data layer', async () => {
    const { client } = await signInAsRole('admin');

    const { rows } = await fetchCaseList(client, {
      page: 1,
      limit: 100,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    expect(rows.some((row) => row.id === INTERNAL_CASE_ID)).toBe(false);
    expect(rows.some((row) => row.reference === INTERNAL_CASE_REFERENCE)).toBe(false);

    await client.auth.signOut();
  });

  it('excludes internal case from global search', async () => {
    const { client } = await signInAsRole('admin');

    const byReference = await fetchGlobalSearch(client, { q: 'FIRM-GENERAL' });
    expect(byReference.some((row) => row.id === INTERNAL_CASE_ID)).toBe(false);

    const byClient = await fetchGlobalSearch(client, { q: 'Firm operations' });
    expect(byClient.some((row) => row.id === INTERNAL_CASE_ID)).toBe(false);

    await client.auth.signOut();
  });

  it('excludes internal case from assignable case picker', async () => {
    const { client } = await signInAsRole('admin');

    const groups = await fetchAssignableCasesGrouped(client);
    expect(groups.some((group) => group.case_id === INTERNAL_CASE_ID)).toBe(false);

    await client.auth.signOut();
  });

  it('shows internal assignment on schedule with case_is_internal flag', async () => {
    const { client } = await signInAsRole('admin');

    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((member) => member.id === ASHA_ID);
    const assignment = asha?.assignments.find((row) => row.id === assignmentId);

    expect(assignment).toBeTruthy();
    expect(assignment?.case_id).toBe(INTERNAL_CASE_ID);
    expect(assignment?.case_is_internal).toBe(true);
    expect(assignment?.task_name).toBe('Clear emails');

    await client.auth.signOut();
  });
});
