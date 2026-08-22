import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createServiceClient,
  createTestUser,
  getApplicationTypeId,
  todayDateString,
} from './helpers';

describe('schema constraints', () => {
  const client = createServiceClient();
  const testUserIds: string[] = [];
  const testCaseIds: string[] = [];

  afterEach(async () => {
    for (const caseId of testCaseIds) {
      await client.from('cases').delete().eq('id', caseId);
    }
    testCaseIds.length = 0;

    for (const userId of testUserIds) {
      await cleanupTestUser(client, userId);
    }
    testUserIds.length = 0;
  });

  it('rejects overlapping task_assignments for the same staff member', async () => {
    const email = `overlap-${Date.now()}@test.local`;
    const user = await createTestUser(client, email);
    testUserIds.push(user.id);

    const appTypeId = await getApplicationTypeId(client, 'SKW');

    const { data: caseRow, error: caseError } = await client
      .from('cases')
      .insert({
        client_first_name: 'Overlap',
        client_last_name: 'Test',
        application_type_id: appTypeId,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (caseError || !caseRow) throw caseError;
    testCaseIds.push(caseRow.id);

    const { data: task, error: taskError } = await client
      .from('tasks')
      .insert({
        case_id: caseRow.id,
        sequence: 1,
        name: 'CCL (Client Care Letter)',
        abbreviation: 'CCL',
      })
      .select('id')
      .single();

    if (taskError || !task) throw taskError;

    const today = todayDateString();

    const { error: firstError } = await client.from('task_assignments').insert({
      task_id: task.id,
      staff_id: user.id,
      date: today,
      start_time: '11:00:00',
      end_time: '12:00:00',
      duration_minutes: 60,
    });

    expect(firstError).toBeNull();

    const { error: overlapError } = await client.from('task_assignments').insert({
      task_id: task.id,
      staff_id: user.id,
      date: today,
      start_time: '11:30:00',
      end_time: '12:30:00',
      duration_minutes: 60,
    });

    expect(overlapError).not.toBeNull();
    expect(overlapError?.message.toLowerCase()).toMatch(/conflict|overlap|exclude/);
  });

  it('enforces uniqueness on reference_counters.year_month', async () => {
    const yearMonth = String(1000 + Math.floor(Math.random() * 9000));

    const { error: firstError } = await client
      .from('reference_counters')
      .insert({ year_month: yearMonth, last_sequence: 1 });

    expect(firstError).toBeNull();

    const { error: duplicateError } = await client
      .from('reference_counters')
      .insert({ year_month: yearMonth, last_sequence: 2 });

    expect(duplicateError).not.toBeNull();
    expect(duplicateError?.code).toBe('23505');
  });

  it('rejects task reminder_note longer than 500 characters', async () => {
    const email = `reminder-note-${Date.now()}@test.local`;
    const user = await createTestUser(client, email);
    testUserIds.push(user.id);

    const appTypeId = await getApplicationTypeId(client, 'SKW');

    const { data: caseRow, error: caseError } = await client
      .from('cases')
      .insert({
        client_first_name: 'Reminder',
        client_last_name: 'Note',
        application_type_id: appTypeId,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (caseError || !caseRow) throw caseError;
    testCaseIds.push(caseRow.id);

    const { error: taskError } = await client.from('tasks').insert({
      case_id: caseRow.id,
      sequence: 1,
      name: 'CCL (Client Care Letter)',
      abbreviation: 'CCL',
      reminder_note: 'x'.repeat(501),
    });

    expect(taskError).not.toBeNull();
    expect(taskError?.message.toLowerCase()).toMatch(/reminder_note|check/);
  });

  it('rejects negative remind_days_before on tasks', async () => {
    const email = `remind-days-${Date.now()}@test.local`;
    const user = await createTestUser(client, email);
    testUserIds.push(user.id);

    const appTypeId = await getApplicationTypeId(client, 'SKW');

    const { data: caseRow, error: caseError } = await client
      .from('cases')
      .insert({
        client_first_name: 'Remind',
        client_last_name: 'Days',
        application_type_id: appTypeId,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (caseError || !caseRow) throw caseError;
    testCaseIds.push(caseRow.id);

    const { error: taskError } = await client.from('tasks').insert({
      case_id: caseRow.id,
      sequence: 1,
      name: 'CCL (Client Care Letter)',
      abbreviation: 'CCL',
      remind_days_before: -1,
    });

    expect(taskError).not.toBeNull();
    expect(taskError?.message.toLowerCase()).toMatch(/remind_days_before|check/);
  });

  it('cascades deletes from cases to dependants and tasks', async () => {
    const email = `cascade-${Date.now()}@test.local`;
    const user = await createTestUser(client, email);
    testUserIds.push(user.id);

    const appTypeId = await getApplicationTypeId(client, 'SKW');

    const { data: caseRow, error: caseError } = await client
      .from('cases')
      .insert({
        client_first_name: 'Cascade',
        client_last_name: 'Test',
        application_type_id: appTypeId,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (caseError || !caseRow) throw caseError;

    const { data: dependant, error: dependantError } = await client
      .from('dependants')
      .insert({
        case_id: caseRow.id,
        name: 'Spouse',
        relationship: 'spouse',
      })
      .select('id')
      .single();

    if (dependantError || !dependant) throw dependantError;

    const { data: task, error: taskError } = await client
      .from('tasks')
      .insert({
        case_id: caseRow.id,
        sequence: 1,
        name: 'CCL (Client Care Letter)',
        abbreviation: 'CCL',
      })
      .select('id')
      .single();

    if (taskError || !task) throw taskError;

    const { error: deleteError } = await client
      .from('cases')
      .delete()
      .eq('id', caseRow.id);

    expect(deleteError).toBeNull();

    const { data: remainingDependants } = await client
      .from('dependants')
      .select('id')
      .eq('id', dependant.id);

    const { data: remainingTasks } = await client
      .from('tasks')
      .select('id')
      .eq('id', task.id);

    expect(remainingDependants).toHaveLength(0);
    expect(remainingTasks).toHaveLength(0);
  });
});
