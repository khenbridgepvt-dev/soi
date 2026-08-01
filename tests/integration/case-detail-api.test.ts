import { describe, expect, it } from 'vitest';
import { signInAsRole, signIn, OTHER_STAFF } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const SAKURA_CASE_ID = 'c0000000-0000-4000-8000-000000000002';

describe('case detail API (ticket 0014, EP-03/TC-028)', () => {
  it('admin can load full case detail', async () => {
    const { client } = await signInAsRole('admin');

    const { data, error } = await client
      .from('cases')
      .select('id')
      .eq('id', VISHNU_CASE_ID)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(VISHNU_CASE_ID);

    const { data: tasks } = await client
      .from('tasks')
      .select('id, sequence, status')
      .eq('case_id', VISHNU_CASE_ID);

    expect(tasks?.length).toBe(13);

    await client.auth.signOut();
  });

  it('assigned staff can read their case and tasks', async () => {
    const { client } = await signInAsRole('staff');

    const { data, error } = await client
      .from('cases')
      .select('id, reference')
      .eq('id', VISHNU_CASE_ID)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.reference).toBe('072601/SKW/VIS');

    const { data: tasks } = await client
      .from('tasks')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID);

    expect(tasks?.length).toBe(13);

    await client.auth.signOut();
  });

  it('TC-028 · staff without assignment cannot read the case', async () => {
    const { client } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data, error } = await client
      .from('cases')
      .select('id')
      .eq('id', VISHNU_CASE_ID);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    await client.auth.signOut();
  });

  it('staff cannot read an unassigned active case', async () => {
    const { client } = await signInAsRole('staff');

    const { data } = await client
      .from('cases')
      .select('id')
      .eq('id', SAKURA_CASE_ID);

    expect(data).toHaveLength(0);

    await client.auth.signOut();
  });
});
