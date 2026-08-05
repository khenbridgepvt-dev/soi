import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { softDeleteCase } from '@/lib/archive/soft-delete-case';
import { fetchCaseTombstone } from '@/lib/cases/fetch-case-tombstone';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { isScheduleAssignmentDeleted } from '@/lib/schedule/assignment-status';
import { addDays, todayISODate } from '@/lib/utils/dates';
import type { Database } from '@/types/database';
import { createServiceClient, getApplicationTypeId } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';
const TARGET_DATE = addDays(todayISODate(), 2);

let harnessCaseId: string;
let harnessTaskId: string;
let harnessAssignmentId: string;
let ashaId: string;

async function createAcceptedCase(
  adminClient: SupabaseClient<Database>,
): Promise<{ caseId: string; taskId: string }> {
  const applicationTypeId = await getApplicationTypeId(service, 'SPV');
  const { data: caseRow, error: caseError } = await service
    .from('cases')
    .insert({
      client_first_name: 'Deleted',
      client_last_name: 'Harness',
      application_type_id: applicationTypeId,
      status: 'lead_pending',
      created_by: ADMIN_ID,
    })
    .select('id')
    .single();

  if (caseError || !caseRow) {
    throw caseError ?? new Error('Failed to create harness case');
  }

  const { error: acceptError } = await adminClient.rpc('accept_lead', {
    p_case_id: caseRow.id,
  });

  if (acceptError) {
    throw acceptError;
  }

  const { data: taskRow, error: taskError } = await service
    .from('tasks')
    .select('id')
    .eq('case_id', caseRow.id)
    .eq('is_deleted', false)
    .order('sequence', { ascending: true })
    .limit(1)
    .single();

  if (taskError || !taskRow) {
    throw taskError ?? new Error('Failed to load harness task');
  }

  return { caseId: caseRow.id, taskId: taskRow.id };
}

describe('deleted case tombstone and schedule pills (ticket 0040)', () => {
  beforeAll(async () => {
    const { userId, client: staffClient } = await signInAsRole('staff');
    ashaId = userId;
    await staffClient.auth.signOut();

    const { client: adminClient } = await signInAsRole('admin');
    const created = await createAcceptedCase(adminClient);
    harnessCaseId = created.caseId;
    harnessTaskId = created.taskId;
    await adminClient.auth.signOut();

    const { data: assignment, error } = await service
      .from('task_assignments')
      .insert({
        task_id: harnessTaskId,
        staff_id: ashaId,
        date: TARGET_DATE,
        start_time: '10:00',
        end_time: '12:00',
        duration_minutes: 120,
      })
      .select('id')
      .single();

    if (error || !assignment) {
      throw error ?? new Error('Failed to seed assignment');
    }

    harnessAssignmentId = assignment.id;
  });

  afterAll(async () => {
    if (harnessAssignmentId) {
      await service.from('task_assignments').delete().eq('id', harnessAssignmentId);
    }
    if (harnessCaseId) {
      await service.from('cases').delete().eq('id', harnessCaseId);
    }
  });

  it('keeps schedule slot booked with deleted pill after soft-delete', async () => {
    const { client: admin } = await signInAsRole('admin');

    await softDeleteCase(admin, harnessCaseId);

    const payload = await fetchSchedule(admin, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);
    const assignment = asha?.assignments.find((row) => row.id === harnessAssignmentId);

    expect(assignment).toBeTruthy();
    expect(assignment?.case_deleted).toBe(true);
    expect(isScheduleAssignmentDeleted(assignment!)).toBe(true);

    await admin.auth.signOut();
  });

  it('returns admin tombstone with deleted_by full name only', async () => {
    const { client: admin } = await signInAsRole('admin');

    const tombstone = await fetchCaseTombstone(admin, harnessCaseId, 'admin');

    expect(tombstone).toBeTruthy();
    expect(tombstone?.deleted_at).toBeTruthy();
    expect(tombstone?.deleted_by_name).toBeTruthy();
    expect(tombstone).not.toHaveProperty('deleted_by_email');
    expect(tombstone).not.toHaveProperty('email');

    await admin.auth.signOut();
  });

  it('does not expose tombstone to staff', async () => {
    const { client: staff } = await signInAsRole('staff');

    const tombstone = await fetchCaseTombstone(staff, harnessCaseId, 'staff');

    expect(tombstone).toBeNull();

    await staff.auth.signOut();
  });
});
