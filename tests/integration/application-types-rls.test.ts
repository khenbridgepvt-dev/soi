import { afterAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { createAnonClient, signInAsRole } from './rls-harness';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function uniqueApplicationTypeCode(): string {
  const n = Date.now();
  return (
    ALPHABET[n % 26] +
    ALPHABET[Math.floor(n / 26) % 26] +
    ALPHABET[Math.floor(n / 676) % 26]
  );
}

describe('application_types RLS (ticket 0010)', () => {
  const service = createServiceClient();
  const inactiveCode = `IN${String.fromCharCode(65 + (Date.now() % 26))}`;
  let inactiveId: string | null = null;

  afterAll(async () => {
    if (inactiveId) {
      await service.from('application_types').delete().eq('id', inactiveId);
    }
  });

  it('staff reads only active application types', async () => {
    const { client } = await signInAsRole('staff');

    const { data, error } = await client
      .from('application_types')
      .select('id, is_active');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((row) => row.is_active)).toBe(true);

    await client.auth.signOut();
  });

  it('staff cannot insert application types', async () => {
    const { client } = await signInAsRole('staff');

    const { error } = await client.from('application_types').insert({
      name: 'Blocked Type',
      code: 'BLK',
    });

    expect(error).not.toBeNull();

    await client.auth.signOut();
  });

  it('admin can insert and update application types', async () => {
    const { client } = await signInAsRole('admin');
    const code = uniqueApplicationTypeCode();

    const { data: created, error: insertError } = await client
      .from('application_types')
      .insert({ name: 'Test Visa Type', code })
      .select('id, name, is_active')
      .single();

    expect(insertError).toBeNull();
    expect(created?.name).toBe('Test Visa Type');

    const { data: updated, error: updateError } = await client
      .from('application_types')
      .update({ is_active: false })
      .eq('id', created!.id)
      .select('is_active')
      .single();

    expect(updateError).toBeNull();
    expect(updated?.is_active).toBe(false);

    await service.from('application_types').delete().eq('id', created!.id);
    await client.auth.signOut();
  });

  it('staff cannot see inactive types after admin deactivates one', async () => {
    const { data: seededInactive, error: seedError } = await service
      .from('application_types')
      .insert({
        name: `Inactive Harness ${Date.now()}`,
        code: inactiveCode,
        is_active: false,
      })
      .select('id')
      .single();

    expect(seedError).toBeNull();
    inactiveId = seededInactive!.id;

    const { client: admin } = await signInAsRole('admin');
    const { data: adminRows } = await admin
      .from('application_types')
      .select('id')
      .eq('id', inactiveId);
    expect(adminRows?.length).toBe(1);
    await admin.auth.signOut();

    const { client: staff } = await signInAsRole('staff');
    const { data: staffRows, error } = await staff
      .from('application_types')
      .select('id')
      .eq('id', inactiveId);

    expect(error).toBeNull();
    expect(staffRows).toHaveLength(0);

    await staff.auth.signOut();
  });

  it('anon cannot read application_types', async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from('application_types').select('id');

    expect(data ?? []).toHaveLength(0);
    expect(error).toBeNull();
  });
});
