import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

/**
 * Reference edit + counter sync (ticket 0014, ADR-0009 rules 1–4).
 */

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const SAKURA_CASE_ID = 'c0000000-0000-4000-8000-000000000002';

const service = createServiceClient();

type EditReferenceResult = {
  reference: string;
  adjusted: boolean;
  requested_reference?: string;
};

async function editReference(
  caseId: string,
  reference: string,
): Promise<{ data: EditReferenceResult | null; error: { message: string } | null }> {
  const { client } = await signInAsRole('admin');
  const { data, error } = await client.rpc('edit_case_reference', {
    p_case_id: caseId,
    p_new_reference: reference,
  });
  await client.auth.signOut();
  return {
    data: (data as EditReferenceResult | null) ?? null,
    error: error ? { message: error.message } : null,
  };
}

async function readCounter(yearMonth: string): Promise<number> {
  const { data } = await service
    .from('reference_counters')
    .select('last_sequence')
    .eq('year_month', yearMonth)
    .maybeSingle();
  return data?.last_sequence ?? 0;
}

async function readReference(caseId: string): Promise<string | null> {
  const { data } = await service
    .from('cases')
    .select('reference')
    .eq('id', caseId)
    .single();
  return data?.reference ?? null;
}

describe('edit_case_reference RPC (ticket 0014, ADR-0009)', () => {
  const originalVishnuRef = '072601/SKW/VIS';
  const originalSakuraRef = '072602/GRD/SAK';

  beforeAll(async () => {
    await service
      .from('cases')
      .update({ reference: originalVishnuRef })
      .eq('id', VISHNU_CASE_ID);
    await service
      .from('cases')
      .update({ reference: originalSakuraRef })
      .eq('id', SAKURA_CASE_ID);
  });

  afterAll(async () => {
    await service
      .from('cases')
      .update({ reference: originalVishnuRef })
      .eq('id', VISHNU_CASE_ID);
    await service
      .from('cases')
      .update({ reference: originalSakuraRef })
      .eq('id', SAKURA_CASE_ID);
  });

  it('ADR rule 1 · rejects a duplicate full reference', async () => {
    const { data, error } = await editReference(VISHNU_CASE_ID, originalSakuraRef);

    expect(data).toBeNull();
    expect(error?.message).toContain('DUPLICATE_REFERENCE');
    expect(await readReference(VISHNU_CASE_ID)).toBe(originalVishnuRef);
  });

  it('ADR rule 2 · shifts to the next free sequence when the target sequence is taken', async () => {
    const { data, error } = await editReference(VISHNU_CASE_ID, '072602/SKW/VIS');

    expect(error).toBeNull();
    expect(data?.adjusted).toBe(true);
    expect(data?.reference).toBe('072603/SKW/VIS');
    expect(await readReference(VISHNU_CASE_ID)).toBe('072603/SKW/VIS');

    // Restore for other tests
    await service
      .from('cases')
      .update({ reference: originalVishnuRef })
      .eq('id', VISHNU_CASE_ID);
  });

  it('ADR rule 3 · syncs the monthly counter to the edited sequence', async () => {
    const counterBefore = await readCounter('0726');
    const target = '072610/SKW/VIS';

    const { data, error } = await editReference(VISHNU_CASE_ID, target);

    expect(error).toBeNull();
    expect(data?.reference).toBe(target);
    expect(await readCounter('0726')).toBe(Math.max(counterBefore, 10));

    await service
      .from('cases')
      .update({ reference: originalVishnuRef })
      .eq('id', VISHNU_CASE_ID);
  });

  it('ADR rule 4 · allows external alignment to any valid unique reference', async () => {
    const externalRef = '072699/SKW/VIS';

    const { data, error } = await editReference(VISHNU_CASE_ID, externalRef);

    expect(error).toBeNull();
    expect(data?.reference).toBe(externalRef);
    expect(await readReference(VISHNU_CASE_ID)).toBe(externalRef);
    expect(await readCounter('0726')).toBeGreaterThanOrEqual(99);

    await service
      .from('cases')
      .update({ reference: originalVishnuRef })
      .eq('id', VISHNU_CASE_ID);
  });

  it('denies non-admin callers', async () => {
    const { client } = await signInAsRole('staff');
    const { error } = await client.rpc('edit_case_reference', {
      p_case_id: VISHNU_CASE_ID,
      p_new_reference: '072611/SKW/VIS',
    });
    await client.auth.signOut();

    expect(error).not.toBeNull();
    expect(await readReference(VISHNU_CASE_ID)).toBe(originalVishnuRef);
  });
});

describe('cases immutability trigger (ticket 0014)', () => {
  it('rejects clearing last_date once set', async () => {
    const { client } = await signInAsRole('admin');
    const { error } = await client
      .from('cases')
      .update({ last_date: null })
      .eq('id', VISHNU_CASE_ID);

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain('last_date');

    await client.auth.signOut();
  });

  it('rejects clearing appointment_date once set', async () => {
    const { client } = await signInAsRole('admin');
    const { error } = await client
      .from('cases')
      .update({ appointment_date: null })
      .eq('id', VISHNU_CASE_ID);

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain('appointment_date');

    await client.auth.signOut();
  });
});
