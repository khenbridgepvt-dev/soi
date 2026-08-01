import { afterAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';

const service = createServiceClient();
const createdDependantIds: string[] = [];

describe('dependants CRUD (ticket 0015)', () => {
  afterAll(async () => {
    for (const id of createdDependantIds) {
      await service.from('dependants').delete().eq('id', id);
    }
  });

  it('TC-024 · admin can add a dependant', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { data, error } = await admin
      .from('dependants')
      .insert({
        case_id: VISHNU_CASE_ID,
        name: 'Harness Dependant',
        relationship: 'spouse',
      })
      .select('id, name, relationship, is_deleted')
      .single();

    expect(error).toBeNull();
    expect(data?.name).toBe('Harness Dependant');
    expect(data?.is_deleted).toBe(false);
    createdDependantIds.push(data!.id);

    await admin.auth.signOut();
  });

  it('TC-026 · admin can soft-delete a dependant', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const { data: created, error: insertError } = await admin
      .from('dependants')
      .insert({
        case_id: VISHNU_CASE_ID,
        name: 'Delete Me',
        relationship: 'child',
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    const dependantId = created!.id;
    createdDependantIds.push(dependantId);

    const { data: deleted, error: deleteError } = await admin
      .from('dependants')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', dependantId)
      .select('id, is_deleted')
      .single();

    expect(deleteError).toBeNull();
    expect(deleted?.is_deleted).toBe(true);

    const { data: visible } = await admin
      .from('dependants')
      .select('id')
      .eq('id', dependantId)
      .eq('is_deleted', false);

    expect(visible).toHaveLength(0);

    await admin.auth.signOut();
  });

  it('staff cannot insert dependants', async () => {
    const { client: staff } = await signInAsRole('staff');

    const { error } = await staff.from('dependants').insert({
      case_id: VISHNU_CASE_ID,
      name: 'Blocked',
      relationship: 'child',
    });

    expect(error).not.toBeNull();

    await staff.auth.signOut();
  });
});
