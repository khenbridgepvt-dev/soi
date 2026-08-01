import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, getApplicationTypeId } from './helpers';
import { signInAsRole } from './rls-harness';
import type { Database } from '@/types/database';
import { DEFAULT_TASKS, DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import {
  currentYearMonth,
  formatCaseReference,
  formatNameSegment,
} from '@/lib/utils/reference';

/**
 * accept_lead RPC — the atomic acceptance transaction (ticket 0013, risk R1).
 *
 * TC-017 format · TC-018 concurrency · TC-019 short name · TC-021 already
 * accepted · TC-023 rollback · TC-032 13 tasks · TC-033 no duplicate tasks.
 */

type AcceptLeadResult = {
  id: string;
  reference: string;
  status: string;
  accepted_at: string;
  tasks_created: number;
};

const service = createServiceClient();
const createdCaseIds: string[] = [];

async function createLead(
  applicationTypeId: string,
  firstName: string,
  createdBy: string,
): Promise<string> {
  const { data, error } = await service
    .from('cases')
    .insert({
      client_first_name: firstName,
      client_last_name: 'Accept',
      application_type_id: applicationTypeId,
      status: 'lead_pending',
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to seed lead');
  }

  createdCaseIds.push(data.id);
  return data.id;
}

async function acceptAs(
  client: SupabaseClient<Database>,
  caseId: string,
): Promise<{ data: AcceptLeadResult | null; error: { code: string; message: string } | null }> {
  const { data, error } = await client.rpc('accept_lead', { p_case_id: caseId });
  return {
    data: (data as AcceptLeadResult | null) ?? null,
    error: error ? { code: error.code ?? '', message: error.message } : null,
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

describe('accept_lead RPC (ticket 0013)', () => {
  let skwTypeId: string;
  let grdTypeId: string;
  let adminId: string;

  beforeAll(async () => {
    skwTypeId = await getApplicationTypeId(service, 'SKW');
    grdTypeId = await getApplicationTypeId(service, 'GRD');
    const { userId } = await signInAsRole('admin');
    adminId = userId;
  });

  afterEach(async () => {
    while (createdCaseIds.length > 0) {
      const id = createdCaseIds.pop()!;
      await service.from('tasks').delete().eq('case_id', id);
      await service.from('cases').delete().eq('id', id);
    }
  });

  it('TC-023 · rolls back everything when a task insert fails mid-transaction', async () => {
    const { client: admin } = await signInAsRole('admin');
    const caseId = await createLead(skwTypeId, 'Rollback', adminId);
    const yearMonth = currentYearMonth();
    const counterBefore = await readCounter(yearMonth);

    // Forced mid-transaction failure: a task at sequence 1 already exists, so
    // the batch insert of the 13 default tasks violates the
    // (case_id, sequence) unique index part-way through.
    const { error: seedTaskError } = await service.from('tasks').insert({
      case_id: caseId,
      sequence: 1,
      name: 'Pre-existing collision task',
      abbreviation: 'COL',
    });
    expect(seedTaskError).toBeNull();

    const { data, error } = await acceptAs(admin, caseId);

    expect(data).toBeNull();
    expect(error).not.toBeNull();

    const { data: after } = await service
      .from('cases')
      .select('status, reference, accepted_at')
      .eq('id', caseId)
      .single();

    expect(after?.status).toBe('lead_pending');
    expect(after?.reference).toBeNull();
    expect(after?.accepted_at).toBeNull();

    const { data: tasks } = await service
      .from('tasks')
      .select('sequence')
      .eq('case_id', caseId);

    expect(tasks?.length).toBe(1);
    expect(await readCounter(yearMonth)).toBe(counterBefore);

    await admin.auth.signOut();
  });

  it('TC-018 · concurrent accepts get distinct sequence numbers', async () => {
    const { client: admin } = await signInAsRole('admin');
    const firstId = await createLead(skwTypeId, 'Concurrent', adminId);
    const secondId = await createLead(grdTypeId, 'Parallel', adminId);

    const [first, second] = await Promise.all([
      acceptAs(admin, firstId),
      acceptAs(admin, secondId),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const firstSeq = first.data!.reference.slice(4, first.data!.reference.indexOf('/'));
    const secondSeq = second.data!.reference.slice(4, second.data!.reference.indexOf('/'));

    expect(firstSeq).not.toBe(secondSeq);
    expect(first.data!.reference).not.toBe(second.data!.reference);

    await admin.auth.signOut();
  });

  it('TC-017/TC-020/TC-032 · generates the reference, flips status, creates 13 tasks', async () => {
    const { client: admin } = await signInAsRole('admin');
    const caseId = await createLead(skwTypeId, 'Mariya', adminId);
    const yearMonth = currentYearMonth();
    const counterBefore = await readCounter(yearMonth);

    const { data, error } = await acceptAs(admin, caseId);

    expect(error).toBeNull();
    expect(data?.status).toBe('active');
    expect(data?.tasks_created).toBe(DEFAULT_TASK_COUNT);
    expect(data?.accepted_at).toBeTruthy();
    expect(data?.reference).toBe(
      formatCaseReference({
        yearMonth,
        sequence: counterBefore + 1,
        typeCode: 'SKW',
        clientFirstName: 'Mariya',
      }),
    );
    expect(await readCounter(yearMonth)).toBe(counterBefore + 1);

    const { data: tasks } = await service
      .from('tasks')
      .select('sequence, name, abbreviation, status, assigned_to, is_custom')
      .eq('case_id', caseId)
      .order('sequence', { ascending: true });

    expect(tasks?.length).toBe(DEFAULT_TASK_COUNT);
    expect(tasks?.every((task) => task.status === 'not_started')).toBe(true);
    expect(tasks?.every((task) => task.assigned_to === null)).toBe(true);
    expect(tasks?.every((task) => task.is_custom === false)).toBe(true);
    expect(
      tasks?.map((task) => ({
        sequence: task.sequence,
        name: task.name,
        abbreviation: task.abbreviation,
      })),
    ).toEqual(
      DEFAULT_TASKS.map((task) => ({
        sequence: task.sequence,
        name: task.name,
        abbreviation: task.abbreviation,
      })),
    );

    await admin.auth.signOut();
  });

  it('TC-019 · pads a short first name with X', async () => {
    const { client: admin } = await signInAsRole('admin');
    const caseId = await createLead(skwTypeId, 'Li', adminId);

    const { data, error } = await acceptAs(admin, caseId);

    expect(error).toBeNull();
    expect(data?.reference.endsWith('/LIX')).toBe(true);

    await admin.auth.signOut();
  });

  it('name segment matches the formatNameSegment() mirror, including non-ASCII', async () => {
    const { client: admin } = await signInAsRole('admin');

    for (const firstName of ['Mariya', "O'Brien", 'Ирина', 'Zoë']) {
      const caseId = await createLead(skwTypeId, firstName, adminId);
      const { data, error } = await acceptAs(admin, caseId);

      expect(error).toBeNull();
      expect(data!.reference.split('/')[2]).toBe(formatNameSegment(firstName));
    }

    await admin.auth.signOut();
  });

  it('TC-021/TC-033 · a second accept fails and leaves exactly 13 tasks', async () => {
    const { client: admin } = await signInAsRole('admin');
    const caseId = await createLead(skwTypeId, 'Doubleclick', adminId);

    const first = await acceptAs(admin, caseId);
    expect(first.error).toBeNull();

    const second = await acceptAs(admin, caseId);
    expect(second.data).toBeNull();
    expect(second.error?.message).toContain('INVALID_STATE_TRANSITION');

    const { count } = await service
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId);

    expect(count).toBe(13);

    const { data: after } = await service
      .from('cases')
      .select('reference')
      .eq('id', caseId)
      .single();

    expect(after?.reference).toBe(first.data!.reference);

    await admin.auth.signOut();
  });

  it('rejects a missing case', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { error } = await acceptAs(admin, '00000000-0000-4000-8000-00000000dead');

    expect(error?.message).toContain('CASE_NOT_FOUND');

    await admin.auth.signOut();
  });

  it('denies non-admin callers', async () => {
    const caseId = await createLead(skwTypeId, 'Denied', adminId);
    const { client: staff } = await signInAsRole('staff');

    const { error } = await acceptAs(staff, caseId);

    expect(error).not.toBeNull();

    const { data: after } = await service
      .from('cases')
      .select('status, reference')
      .eq('id', caseId)
      .single();

    expect(after?.status).toBe('lead_pending');
    expect(after?.reference).toBeNull();

    await staff.auth.signOut();
  });
});
