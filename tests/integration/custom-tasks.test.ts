import { afterAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';
const BLESS_ID = 'a0000000-0000-4000-8000-000000000004';

const service = createServiceClient();

describe('custom tasks (ticket 0016, EP-11b)', () => {
  afterAll(async () => {
    await service.from('tasks').delete().eq('case_id', VISHNU_CASE_ID).eq('is_custom', true);
  });

  it('TC-033b · admin can append a custom task after sequence 13', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { data: maxRow } = await admin
      .from('tasks')
      .select('sequence')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('is_deleted', false)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSequence = (maxRow?.sequence ?? 0) + 1;

    const { data, error } = await admin
      .from('tasks')
      .insert({
        case_id: VISHNU_CASE_ID,
        sequence: nextSequence,
        name: 'Harness Custom',
        abbreviation: 'HC',
        description: 'Integration harness task',
        is_custom: true,
        status: 'not_started',
      })
      .select('id, sequence, name, abbreviation, is_custom, status')
      .single();

    expect(error).toBeNull();
    expect(data?.sequence).toBeGreaterThanOrEqual(14);
    expect(data?.is_custom).toBe(true);
    expect(data?.status).toBe('not_started');

    await admin.auth.signOut();
  });

  it('TC-033c · rejects the sixth custom task on a case', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { count: existingCount } = await admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', VISHNU_CASE_ID)
      .eq('is_custom', true)
      .eq('is_deleted', false);

    const toCreate = 5 - (existingCount ?? 0);
    for (let i = 0; i < toCreate; i++) {
      const { data: maxRow } = await admin
        .from('tasks')
        .select('sequence')
        .eq('case_id', VISHNU_CASE_ID)
        .eq('is_deleted', false)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      await admin.from('tasks').insert({
        case_id: VISHNU_CASE_ID,
        sequence: (maxRow?.sequence ?? 0) + 1,
        name: `Fill ${i}`,
        abbreviation: `F${i}`,
        is_custom: true,
        status: 'not_started',
      });
    }

    const { count } = await admin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', VISHNU_CASE_ID)
      .eq('is_custom', true)
      .eq('is_deleted', false);

    expect(count).toBe(5);

    const { data: maxRow } = await admin
      .from('tasks')
      .select('sequence')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('is_deleted', false)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await admin.from('tasks').insert({
      case_id: VISHNU_CASE_ID,
      sequence: (maxRow?.sequence ?? 0) + 1,
      name: 'Too Many',
      abbreviation: 'TM',
      is_custom: true,
      status: 'not_started',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('Maximum of 5 custom tasks');

    await admin.auth.signOut();
  });

  it('staff cannot insert custom tasks', async () => {
    const { client: staff } = await signInAsRole('staff');

    const { error } = await staff.from('tasks').insert({
      case_id: VISHNU_CASE_ID,
      sequence: 50,
      name: 'Blocked',
      abbreviation: 'BLK',
      is_custom: true,
      status: 'not_started',
    });

    expect(error).not.toBeNull();

    await staff.auth.signOut();
  });
});

describe('tasks column trigger (TC-099 tasks legs)', () => {
  it('staff can update allowed columns on an assigned task', async () => {
    const { client: staff } = await signInAsRole('staff');

    const { data: task } = await staff
      .from('tasks')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('assigned_to', ASHA_ID)
      .eq('sequence', 1)
      .maybeSingle();

    expect(task?.id).toBeTruthy();

    const { error } = await staff
      .from('tasks')
      .update({ notes: 'Harness note update' })
      .eq('id', task!.id);

    expect(error).toBeNull();

    await staff.auth.signOut();
  });

  it('staff cannot change assigned_to on their task', async () => {
    const { client: staff, userId } = await signInAsRole('staff');

    const { data: task } = await staff
      .from('tasks')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('assigned_to', userId)
      .eq('sequence', 2)
      .maybeSingle();

    const { error } = await staff
      .from('tasks')
      .update({ assigned_to: BLESS_ID })
      .eq('id', task!.id);

    expect(error).not.toBeNull();
    expect(error?.message).toContain('assigned_to');

    await staff.auth.signOut();
  });

  it('staff cannot update a task assigned to someone else', async () => {
    const { client: staff } = await signInAsRole('staff');

    const { data: task } = await staff
      .from('tasks')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('sequence', 8)
      .maybeSingle();

    const { data, error } = await staff
      .from('tasks')
      .update({ notes: 'Should fail' })
      .eq('id', task!.id)
      .select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    await staff.auth.signOut();
  });
});
