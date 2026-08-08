import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { signIn, signInAsRole, OTHER_STAFF } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();

type SeniorReviewResult = {
  outcome: string;
  senior_approval: string;
  status: string;
  senior_revision_count: number;
  alert_admins?: boolean;
};

async function resetVishnuSeniorReviewHarness(): Promise<void> {
  await service.from('notifications').delete().eq('case_id', VISHNU_CASE_ID);

  await service
    .from('cases')
    .update({ senior_revision_count: 0 })
    .eq('id', VISHNU_CASE_ID);

  await service
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: '2026-07-06T14:00:00+00',
      completed_by: ASHA_ID,
      senior_approval: null,
      revision_notes: null,
    })
    .eq('case_id', VISHNU_CASE_ID)
    .eq('sequence', 5);

  await service
    .from('tasks')
    .update({
      status: 'in_progress',
      completed_at: null,
      completed_by: null,
      senior_approval: null,
      revision_notes: null,
    })
    .eq('case_id', VISHNU_CASE_ID)
    .eq('sequence', 8);

  await service
    .from('tasks')
    .update({
      status: 'not_started',
      completed_at: null,
      completed_by: null,
    })
    .eq('case_id', VISHNU_CASE_ID)
    .eq('sequence', 9);
}

async function taskId(sequence: number): Promise<string> {
  const { data, error } = await service
    .from('tasks')
    .select('id')
    .eq('case_id', VISHNU_CASE_ID)
    .eq('sequence', sequence)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error(`Task ${sequence} not found`);
  }

  return data.id;
}

describe('senior review (ticket 0018, EP-17)', () => {
  beforeEach(async () => {
    await resetVishnuSeniorReviewHarness();
  });

  afterAll(async () => {
    await resetVishnuSeniorReviewHarness();
  });

  it('TC-040 · senior approval unlocks Task 9', async () => {
    const { client: senior } = await signInAsRole('senior');
    const task8Id = await taskId(8);
    const task9Id = await taskId(9);

    const { data, error } = await senior.rpc('submit_senior_review', {
      p_task_id: task8Id,
      p_outcome: 'approved',
      p_revision_notes: undefined,
    });

    expect(error).toBeNull();
    const payload = data as SeniorReviewResult | null;
    expect(payload?.outcome).toBe('approved');
    expect(payload?.senior_approval).toBe('approved');
    expect(payload?.status).toBe('completed');

    const { data: task8 } = await senior
      .from('tasks')
      .select('status, senior_approval')
      .eq('id', task8Id)
      .single();

    expect(task8?.status).toBe('completed');
    expect(task8?.senior_approval).toBe('approved');

    const { client: admin } = await signInAsRole('admin');
    await admin.from('tasks').update({ status: 'in_progress' }).eq('id', task9Id);

    const { error: completeError } = await admin.rpc('update_task_status', {
      p_task_id: task9Id,
      p_new_status: 'completed',
    });

    expect(completeError).toBeNull();

    await admin.auth.signOut();
    await senior.auth.signOut();
  });

  it('TC-041 · revisions reopen Task 5 and increment revision count', async () => {
    const { client: senior } = await signInAsRole('senior');
    const task8Id = await taskId(8);
    const task5Id = await taskId(5);

    const { data, error } = await senior.rpc('submit_senior_review', {
      p_task_id: task8Id,
      p_outcome: 'revisions_required',
      p_revision_notes: 'Update the employment history section.',
    });

    expect(error).toBeNull();
    const payload = data as SeniorReviewResult | null;
    expect(payload?.outcome).toBe('revisions_required');
    expect(payload?.senior_revision_count).toBe(1);
    expect(payload?.alert_admins).toBe(false);

    const { data: task5 } = await senior
      .from('tasks')
      .select('status, completed_at')
      .eq('id', task5Id)
      .single();

    expect(task5?.status).toBe('in_progress');
    expect(task5?.completed_at).toBeNull();

    const { data: caseRow } = await senior
      .from('cases')
      .select('senior_revision_count')
      .eq('id', VISHNU_CASE_ID)
      .single();

    expect(caseRow?.senior_revision_count).toBe(1);

    await senior.auth.signOut();
  });

  it('TC-042 · Task 9 blocked until Task 8 approved', async () => {
    const { client: admin } = await signInAsRole('admin');
    const task9Id = await taskId(9);

    await admin.from('tasks').update({ status: 'in_progress' }).eq('id', task9Id);

    const { error } = await admin.rpc('update_task_status', {
      p_task_id: task9Id,
      p_new_status: 'completed',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('PREREQUISITE_NOT_MET');

    await admin.auth.signOut();
  });

  it('TC-042 · third revision cycle alerts admins', async () => {
    await service
      .from('cases')
      .update({ senior_revision_count: 2 })
      .eq('id', VISHNU_CASE_ID);

    const { client: senior } = await signInAsRole('senior');
    const task8Id = await taskId(8);

    const { data, error } = await senior.rpc('submit_senior_review', {
      p_task_id: task8Id,
      p_outcome: 'revisions_required',
      p_revision_notes: 'Third round of fixes needed.',
    });

    expect(error).toBeNull();
    const payload = data as SeniorReviewResult | null;
    expect(payload?.senior_revision_count).toBe(3);
    expect(payload?.alert_admins).toBe(true);

    await senior.auth.signOut();
  });

  it('staff cannot submit senior review outcomes', async () => {
    const { client: staff } = await signInAsRole('staff');
    const task8Id = await taskId(8);

    const { error } = await staff.rpc('submit_senior_review', {
      p_task_id: task8Id,
      p_outcome: 'approved',
      p_revision_notes: undefined,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('FORBIDDEN');

    await staff.auth.signOut();
  });

  it('admin can submit senior review outcomes', async () => {
    const { client: admin } = await signInAsRole('admin');
    const task8Id = await taskId(8);

    const { data, error } = await admin.rpc('submit_senior_review', {
      p_task_id: task8Id,
      p_outcome: 'approved',
      p_revision_notes: undefined,
    });

    expect(error).toBeNull();
    const payload = data as SeniorReviewResult | null;
    expect(payload?.outcome).toBe('approved');

    await admin.auth.signOut();
  });

  it('unassigned staff cannot submit senior review', async () => {
    const { client: bless } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);
    const task8Id = await taskId(8);

    const { error } = await bless.rpc('submit_senior_review', {
      p_task_id: task8Id,
      p_outcome: 'approved',
      p_revision_notes: undefined,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('FORBIDDEN');

    await bless.auth.signOut();
  });
});
