import { afterAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { signIn, signInAsRole, OTHER_STAFF } from './rls-harness';

const SAKURA_CASE_ID = 'c0000000-0000-4000-8000-000000000002';
const BLESS_ID = 'a0000000-0000-4000-8000-000000000004';

const service = createServiceClient();

describe('task status machine (ticket 0017, EP-12)', () => {
  afterAll(async () => {
    await service
      .from('cases')
      .update({ status: 'active', completed_at: null })
      .eq('id', SAKURA_CASE_ID);

    await service
      .from('tasks')
      .update({
        status: 'not_started',
        completed_at: null,
        completed_by: null,
      })
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 5);
  });

  it('TC-036 · staff can move not_started → in_progress', async () => {
    const { client: bless } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    await bless
      .from('tasks')
      .update({ status: 'not_started', completed_at: null, completed_by: null })
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 5);

    const { data: task } = await bless
      .from('tasks')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 5)
      .maybeSingle();

    const { data, error } = await bless.rpc('update_task_status', {
      p_task_id: task!.id,
      p_new_status: 'in_progress',
    });

    expect(error).toBeNull();
    const payload = data as { status: string } | null;
    expect(payload?.status).toBe('in_progress');

    await bless.auth.signOut();
  });

  it('TC-037 · in_progress → completed sets completed metadata', async () => {
    const { client: bless, userId } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data: task } = await bless
      .from('tasks')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 5)
      .maybeSingle();

    await bless
      .from('tasks')
      .update({ status: 'in_progress' })
      .eq('id', task!.id);

    const { error } = await bless.rpc('update_task_status', {
      p_task_id: task!.id,
      p_new_status: 'completed',
    });

    expect(error).toBeNull();

    const { data: updated } = await bless
      .from('tasks')
      .select('status, completed_at, completed_by')
      .eq('id', task!.id)
      .single();

    expect(updated?.status).toBe('completed');
    expect(updated?.completed_at).not.toBeNull();
    expect(updated?.completed_by).toBe(userId);

    await bless.auth.signOut();
  });

  it('TC-038 · staff cannot revert completed tasks', async () => {
    const { client: bless } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data: task } = await bless
      .from('tasks')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 1)
      .maybeSingle();

    const { error } = await bless.rpc('update_task_status', {
      p_task_id: task!.id,
      p_new_status: 'in_progress',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('INVALID_STATE_TRANSITION');

    await bless.auth.signOut();
  });

  it('TC-039 · allows not_started → completed for custom tasks (ticket 0049)', async () => {
    const { client: bless } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data: customTask, error: insertError } = await service
      .from('tasks')
      .insert({
        case_id: SAKURA_CASE_ID,
        sequence: 99,
        name: 'Direct complete harness',
        abbreviation: 'DCH',
        status: 'not_started',
        assigned_to: BLESS_ID,
        is_custom: true,
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();

    const { data, error } = await bless.rpc('update_task_status', {
      p_task_id: customTask!.id,
      p_new_status: 'completed',
    });

    expect(error).toBeNull();
    const payload = data as { status: string } | null;
    expect(payload?.status).toBe('completed');

    await service.from('tasks').delete().eq('id', customTask!.id);
    await bless.auth.signOut();
  });

  it('TC-039b · denies not_started → completed when prerequisites fail (ticket 0049)', async () => {
    const { client: bless } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data: task } = await service
      .from('tasks')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 10)
      .maybeSingle();

    await service
      .from('tasks')
      .update({
        assigned_to: BLESS_ID,
        status: 'not_started',
        completed_at: null,
        completed_by: null,
      })
      .eq('id', task!.id);

    const { error } = await bless.rpc('update_task_status', {
      p_task_id: task!.id,
      p_new_status: 'completed',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('PREREQUISITE_NOT_MET');

    await bless.auth.signOut();
  });

  it('TC-044 · task 10 prerequisites block completion', async () => {
    const { client: admin } = await signInAsRole('admin');

    await admin
      .from('tasks')
      .update({
        status: 'not_started',
        completed_at: null,
        completed_by: null,
      })
      .eq('case_id', SAKURA_CASE_ID)
      .in('sequence', [9, 10]);

    const { data: task10 } = await admin
      .from('tasks')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 10)
      .maybeSingle();

    await admin.from('tasks').update({ status: 'in_progress' }).eq('id', task10!.id);

    const { error } = await admin.rpc('update_task_status', {
      p_task_id: task10!.id,
      p_new_status: 'completed',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('PREREQUISITE_NOT_MET');

    await admin.auth.signOut();
  });

  it('TC-043 · task 10 completes when prerequisites met', async () => {
    const { client: admin } = await signInAsRole('admin');

    await admin
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: BLESS_ID })
      .eq('case_id', SAKURA_CASE_ID)
      .in('sequence', [1, 2, 9]);

    const { data: task10 } = await admin
      .from('tasks')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID)
      .eq('sequence', 10)
      .maybeSingle();

    await admin.from('tasks').update({ status: 'in_progress' }).eq('id', task10!.id);

    const { error } = await admin.rpc('update_task_status', {
      p_task_id: task10!.id,
      p_new_status: 'completed',
    });

    expect(error).toBeNull();

    await admin.auth.signOut();
  });
});

describe('case completion (ticket 0017)', () => {
  const harnessCaseId = 'c0000000-0000-4000-8000-000000000099';

  afterAll(async () => {
    await service.from('tasks').delete().eq('case_id', harnessCaseId);
    await service.from('cases').delete().eq('id', harnessCaseId);
  });

  it('completing the final task marks the case completed', async () => {
    const { data: appType } = await service
      .from('application_types')
      .select('id')
      .eq('code', 'SKW')
      .single();

    await service.from('cases').upsert({
      id: harnessCaseId,
      client_first_name: 'Harness',
      client_last_name: 'Completion',
      application_type_id: appType!.id,
      status: 'active',
      created_by: BLESS_ID,
      reference: '072699/SKW/HAR',
      accepted_at: new Date().toISOString(),
    });

    const { data: task } = await service
      .from('tasks')
      .insert({
        case_id: harnessCaseId,
        sequence: 1,
        name: 'Only Task',
        abbreviation: 'ONE',
        status: 'in_progress',
        assigned_to: BLESS_ID,
        is_custom: false,
      })
      .select('id')
      .single();

    const { client: bless } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data, error } = await bless.rpc('update_task_status', {
      p_task_id: task!.id,
      p_new_status: 'completed',
    });

    expect(error).toBeNull();
    const payload = data as { case_completed: boolean } | null;
    expect(payload?.case_completed).toBe(true);

    const { data: caseRow } = await service
      .from('cases')
      .select('status, completed_at')
      .eq('id', harnessCaseId)
      .single();

    expect(caseRow?.status).toBe('completed');
    expect(caseRow?.completed_at).not.toBeNull();

    await bless.auth.signOut();
  });
});
