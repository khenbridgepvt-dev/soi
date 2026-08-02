import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchArchiveList } from '@/lib/archive/fetch-archive-list';
import { purgeExpiredRecords } from '@/lib/archive/purge-expired';
import { restoreArchivedRecord } from '@/lib/archive/restore-archived';
import { softDeleteCase } from '@/lib/archive/soft-delete-case';
import { fetchCaseList } from '@/lib/cases/fetch-case-list';
import { parseCaseListQuery } from '@/lib/cases/list-query';
import { createServiceClient, getApplicationTypeId } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';

let harnessCaseId: string;

async function createHarnessCase(): Promise<string> {
  const applicationTypeId = await getApplicationTypeId(service, 'SPV');
  const { data, error } = await service
    .from('cases')
    .insert({
      client_first_name: 'Archive',
      client_last_name: 'Harness',
      application_type_id: applicationTypeId,
      status: 'lead_pending',
      created_by: ADMIN_ID,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create harness case');
  }

  return data.id;
}

describe('archive and soft-delete (ticket 0030, EP-08/39–41)', () => {
  beforeAll(async () => {
    harnessCaseId = await createHarnessCase();
  });

  afterAll(async () => {
    await service.from('cases').delete().eq('id', harnessCaseId);
  });

  it('TC-092 · soft-delete hides a case from operational views', async () => {
    const { client } = await signInAsRole('admin');

    await softDeleteCase(client, harnessCaseId);

    const operational = await fetchCaseList(
      client,
      parseCaseListQuery(new URLSearchParams(), 'admin'),
    );
    expect(operational.rows.some((row) => row.id === harnessCaseId)).toBe(false);

    const { data: archivedCase } = await service
      .from('cases')
      .select('is_deleted, deleted_at')
      .eq('id', harnessCaseId)
      .single();

    expect(archivedCase?.is_deleted).toBe(true);
    expect(archivedCase?.deleted_at).toBeTruthy();

    const archive = await fetchArchiveList(client, { page: 1, limit: 50, type: 'case' });
    expect(archive.rows.some((row) => row.id === harnessCaseId)).toBe(true);

    await client.auth.signOut();
  });

  it('TC-093 · restore returns a deleted case to operational views', async () => {
    const { client } = await signInAsRole('admin');

    await restoreArchivedRecord(client, harnessCaseId, 'case');

    const operational = await fetchCaseList(
      client,
      parseCaseListQuery(new URLSearchParams(), 'admin'),
    );
    expect(operational.rows.some((row) => row.id === harnessCaseId)).toBe(true);

    const archive = await fetchArchiveList(client, { page: 1, limit: 50, type: 'case' });
    expect(archive.rows.some((row) => row.id === harnessCaseId)).toBe(false);

    await client.auth.signOut();
  });

  it('TC-094 · purge permanently removes records past retention', async () => {
    const purgeCaseId = await createHarnessCase();
    const { client } = await signInAsRole('admin');

    await softDeleteCase(client, purgeCaseId);

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() - 91);

    await service
      .from('cases')
      .update({ deleted_at: expiredAt.toISOString() })
      .eq('id', purgeCaseId);

    const result = await purgeExpiredRecords(client, 90);
    expect(result.purged_cases).toBeGreaterThanOrEqual(1);

    const { data: caseRow } = await service
      .from('cases')
      .select('id')
      .eq('id', purgeCaseId)
      .maybeSingle();

    expect(caseRow).toBeNull();

    await client.auth.signOut();
  });
});
