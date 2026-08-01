import { afterAll, describe, expect, it } from 'vitest';
import { createAnonClient, OTHER_STAFF, signIn, signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const SAKURA_CASE_ID = 'c0000000-0000-4000-8000-000000000002';
const KIM_LEAD_CASE_ID = 'c0000000-0000-4000-8000-000000000003';
const FATIMA_CASE_ID = 'c0000000-0000-4000-8000-000000000004';
const RAHMAN_CASE_ID = 'c0000000-0000-4000-8000-000000000005';

describe('cases + dependants RLS (ticket 0011)', () => {
  afterAll(async () => {
    const { client } = await signInAsRole('admin');
    await client.auth.signOut();
  });

  it('admin reads all active seed cases', async () => {
    const { client } = await signInAsRole('admin');

    const { data, error } = await client.from('cases').select('id, status');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(6);

    await client.auth.signOut();
  });

  it('staff reads only assigned active cases', async () => {
    const { client } = await signInAsRole('staff');

    const { data, error } = await client.from('cases').select('id');

    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => row.id);
    expect(ids).toContain(VISHNU_CASE_ID);
    expect(ids).toContain(FATIMA_CASE_ID);
    expect(ids).not.toContain(SAKURA_CASE_ID);
    expect(ids).not.toContain(KIM_LEAD_CASE_ID);
    expect(ids).not.toContain(RAHMAN_CASE_ID);

    await client.auth.signOut();
  });

  it('staff cannot read another staff member’s assigned active case', async () => {
    const { client } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data, error } = await client
      .from('cases')
      .select('id')
      .eq('id', VISHNU_CASE_ID);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    await client.auth.signOut();
  });

  it('staff may update notes only on assigned cases', async () => {
    const { client } = await signInAsRole('staff');

    const { error: notesError } = await client
      .from('cases')
      .update({ notes: 'Harness note update' })
      .eq('id', VISHNU_CASE_ID);

    expect(notesError).toBeNull();

    const { error: statusError } = await client
      .from('cases')
      .update({ client_first_name: 'Blocked' })
      .eq('id', VISHNU_CASE_ID);

    expect(statusError).not.toBeNull();
    expect(statusError?.message.toLowerCase()).toContain('permission denied');

    await client.auth.signOut();
  });

  it('staff reads dependants only for assigned active cases', async () => {
    const { client } = await signInAsRole('staff');

    const { data: allowed, error } = await client
      .from('dependants')
      .select('id, case_id')
      .eq('case_id', VISHNU_CASE_ID);

    expect(error).toBeNull();
    expect(allowed?.length).toBe(1);

    const { data: denied } = await client
      .from('dependants')
      .select('id')
      .eq('case_id', FATIMA_CASE_ID);

    expect(denied?.length).toBe(2);

    const { data: blocked } = await client
      .from('dependants')
      .select('id')
      .eq('case_id', SAKURA_CASE_ID);

    expect(blocked).toHaveLength(0);

    await client.auth.signOut();
  });

  it('anon cannot read cases or dependants', async () => {
    const anon = createAnonClient();

    const { data: cases, error: casesError } = await anon.from('cases').select('id');
    const { data: dependants, error: dependantsError } = await anon
      .from('dependants')
      .select('id');

    expect(casesError).toBeNull();
    expect(dependantsError).toBeNull();
    expect(cases ?? []).toHaveLength(0);
    expect(dependants ?? []).toHaveLength(0);
  });
});
