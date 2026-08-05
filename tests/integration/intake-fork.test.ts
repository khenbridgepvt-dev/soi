import { afterAll, describe, expect, it } from 'vitest';
import { DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import {
  acceptLeadRecord,
  createLeadAndAccept,
  createLeadRecord,
} from '@/lib/cases/create-lead-and-accept';
import { createServiceClient, getApplicationTypeId } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const createdCaseIds: string[] = [];

describe('intake fork create lead vs open case (ticket 0035)', () => {
  let applicationTypeId: string;

  afterAll(async () => {
    if (createdCaseIds.length > 0) {
      await service.from('tasks').delete().in('case_id', createdCaseIds);
      await service.from('cases').delete().in('id', createdCaseIds);
    }
  });

  it('create lead only leaves case lead_pending with no tasks', async () => {
    const { client: admin, userId } = await signInAsRole('admin');
    applicationTypeId = await getApplicationTypeId(service, 'SKW');

    const result = await createLeadRecord(admin, userId, {
      client_first_name: 'Fork',
      client_last_name: 'LeadOnly',
      application_type_id: applicationTypeId,
      notes: 'Intake fork harness',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdCaseIds.push(result.caseId);

    const { data: caseRow } = await service
      .from('cases')
      .select('status, reference')
      .eq('id', result.caseId)
      .single();

    expect(caseRow?.status).toBe('lead_pending');
    expect(caseRow?.reference).toBeNull();

    const { count } = await service
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', result.caseId);

    expect(count).toBe(0);

    await admin.auth.signOut();
  });

  it('create and accept produces active case with reference and 13 tasks', async () => {
    const { client: admin, userId } = await signInAsRole('admin');
    applicationTypeId = await getApplicationTypeId(service, 'SKW');

    const result = await createLeadAndAccept(admin, userId, {
      client_first_name: 'Fork',
      client_last_name: 'OpenCase',
      application_type_id: applicationTypeId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdCaseIds.push(result.data.id);
    expect(result.data.status).toBe('active');
    expect(result.data.reference).toBeTruthy();
    expect(result.data.tasks_created).toBe(DEFAULT_TASK_COUNT);

    const { count } = await service
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', result.data.id)
      .eq('is_deleted', false);

    expect(count).toBe(DEFAULT_TASK_COUNT);

    await admin.auth.signOut();
  });

  it('accept rejects a case that is not lead_pending', async () => {
    const { client: admin, userId } = await signInAsRole('admin');
    applicationTypeId = await getApplicationTypeId(service, 'SKW');

    const createResult = await createLeadAndAccept(admin, userId, {
      client_first_name: 'Already',
      client_last_name: 'Accepted',
      application_type_id: applicationTypeId,
    });

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) {
      return;
    }

    createdCaseIds.push(createResult.data.id);

    const acceptAgain = await acceptLeadRecord(admin, createResult.data.id);
    expect(acceptAgain.ok).toBe(false);

    await admin.auth.signOut();
  });
});
