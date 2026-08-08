import { afterAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';

const service = createServiceClient();
const createdDependantIds: string[] = [];

describe('dependant relationship constraint (ticket 0054)', () => {
  afterAll(async () => {
    for (const id of createdDependantIds) {
      await service.from('dependants').delete().eq('id', id);
    }
  });

  it('seeds FM and SKD_OUT_UK application types', async () => {
    const { data: fm, error: fmError } = await service
      .from('application_types')
      .select('id, name, code, sort_order, is_active')
      .eq('code', 'FM')
      .single();

    expect(fmError).toBeNull();
    expect(fm).toMatchObject({
      name: 'Family Route (FM)',
      code: 'FM',
      sort_order: 9,
      is_active: true,
    });

    const { data: skdOutUk, error: skdOutUkError } = await service
      .from('application_types')
      .select('id, name, code, sort_order, is_active')
      .eq('code', 'SKD_OUT_UK')
      .single();

    expect(skdOutUkError).toBeNull();
    expect(skdOutUk).toMatchObject({
      name: 'Dependant Outside UK',
      code: 'SKD_OUT_UK',
      sort_order: 10,
      is_active: true,
    });
  });

  it('POST dependant with relationship child succeeds', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { data, error } = await admin
      .from('dependants')
      .insert({
        case_id: VISHNU_CASE_ID,
        name: 'Relationship Harness Child',
        relationship: 'child',
      })
      .select('id, relationship')
      .single();

    expect(error).toBeNull();
    expect(data?.relationship).toBe('child');
    createdDependantIds.push(data!.id);

    await admin.auth.signOut();
  });

  it('rejects invalid relationship at database level', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { error } = await admin.from('dependants').insert({
      case_id: VISHNU_CASE_ID,
      name: 'Invalid Relationship',
      relationship: 'wife',
    });

    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/dependants_relationship_check|check constraint/i);

    await admin.auth.signOut();
  });
});
