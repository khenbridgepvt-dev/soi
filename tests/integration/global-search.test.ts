import { afterAll, describe, expect, it } from 'vitest';
import { fetchGlobalSearch } from '@/lib/search/fetch-global-search';
import { OTHER_STAFF, signIn, signInAsRole } from './rls-harness';

const VISHNU_REFERENCE = '072601/SKW/VIS';

describe('global search (ticket 0029, EP-38 / US-9.1)', () => {
  afterAll(async () => {
    const { client } = await signInAsRole('admin');
    await client.auth.signOut();
  });

  it('TC-089 · typo-tolerant client name match', async () => {
    const { client } = await signInAsRole('admin');

    const results = await fetchGlobalSearch(client, { q: 'Vishn', limit: 8 });

    expect(results.some((row) => row.client_name.includes('Vishnu'))).toBe(true);
    expect(results[0]).toMatchObject({
      reference: VISHNU_REFERENCE,
      status: 'active',
    });

    await client.auth.signOut();
  });

  it('TC-090 · matches by reference partial', async () => {
    const { client } = await signInAsRole('admin');

    const results = await fetchGlobalSearch(client, { q: '072601' });

    expect(results.some((row) => row.reference === VISHNU_REFERENCE)).toBe(true);

    await client.auth.signOut();
  });

  it('TC-091 · staff only sees assigned cases', async () => {
    const { client: staff } = await signInAsRole('staff');

    const blocked = await fetchGlobalSearch(staff, { q: 'Sakura' });
    expect(blocked.some((row) => row.client_name.includes('Sakura'))).toBe(false);

    const allowed = await fetchGlobalSearch(staff, { q: 'Vishnu' });
    expect(allowed.some((row) => row.reference === VISHNU_REFERENCE)).toBe(true);

    await staff.auth.signOut();

    const { client: colleague } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);
    const colleagueResults = await fetchGlobalSearch(colleague, { q: 'Vishnu' });
    expect(colleagueResults.some((row) => row.reference === VISHNU_REFERENCE)).toBe(false);

    await colleague.auth.signOut();
  });

  it('responds within the TC-091 performance bound (< 500ms)', async () => {
    const { client } = await signInAsRole('admin');

    const started = performance.now();
    await fetchGlobalSearch(client, { q: 'Patel', limit: 8 });
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(500);

    await client.auth.signOut();
  });

  it('returns no rows when the query is shorter than 2 characters', async () => {
    const { client } = await signInAsRole('admin');

    const results = await fetchGlobalSearch(client, { q: 'V' });
    expect(results).toEqual([]);

    await client.auth.signOut();
  });
});
