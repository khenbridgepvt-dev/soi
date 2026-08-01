import { describe, expect, it } from 'vitest';
import { SEED_CREDENTIALS, signIn, signInAsRole } from './rls-harness';

/**
 * Mirrors LoginForm's post-sign-in profile check: filter to the signed-in
 * user's row so admin RLS (all rows) does not trip .single() with PGRST116.
 */
describe('login profile check (LoginForm pattern)', () => {
  it('admin@firm.com reads own profile without PGRST116', async () => {
    const { client, userId } = await signIn(
      SEED_CREDENTIALS.admin.email,
      SEED_CREDENTIALS.admin.password,
    );

    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(userId);

    await client.auth.signOut();
  });

  it('asha@firm.com reads own profile without PGRST116', async () => {
    const { client, userId } = await signIn(
      SEED_CREDENTIALS.staff.email,
      SEED_CREDENTIALS.staff.password,
    );

    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(userId);

    await client.auth.signOut();
  });

  it('unfiltered .single() fails for admin (documents the bug)', async () => {
    const { client } = await signInAsRole('admin');

    const { error } = await client.from('profiles').select('id').single();

    expect(error).not.toBeNull();
    expect(error?.code).toBe('PGRST116');

    await client.auth.signOut();
  });
});
