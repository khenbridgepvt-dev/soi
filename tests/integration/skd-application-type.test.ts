import { afterAll, describe, expect, it } from 'vitest';
import { createLeadAndAccept } from '@/lib/cases/create-lead-and-accept';
import { DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import { createServiceClient, getApplicationTypeId } from './helpers';
import { signInAsRole } from './rls-harness';

const service = createServiceClient();
const createdCaseIds: string[] = [];

describe('SKD application type (ticket 0036)', () => {
  afterAll(async () => {
    if (createdCaseIds.length > 0) {
      await service.from('tasks').delete().in('case_id', createdCaseIds);
      await service.from('cases').delete().in('id', createdCaseIds);
    }
  });

  it('seeds Skilled Worker Dependant (SKD) application type', async () => {
    const { data, error } = await service
      .from('application_types')
      .select('id, name, code, sort_order, is_active')
      .eq('code', 'SKD')
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      name: 'Skilled Worker Dependant',
      code: 'SKD',
      sort_order: 8,
      is_active: true,
    });
  });

  it('create lead with SKD and accept generates reference containing /SKD/', async () => {
    const { client: admin, userId } = await signInAsRole('admin');
    const skdTypeId = await getApplicationTypeId(service, 'SKD');

    const result = await createLeadAndAccept(admin, userId, {
      client_first_name: 'Maria',
      client_last_name: 'Santos',
      application_type_id: skdTypeId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdCaseIds.push(result.data.id);
    expect(result.data.status).toBe('active');
    expect(result.data.reference).toMatch(/\/SKD\//);
    expect(result.data.tasks_created).toBe(DEFAULT_TASK_COUNT);

    const { count } = await service
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', result.data.id)
      .eq('is_deleted', false);

    expect(count).toBe(DEFAULT_TASK_COUNT);

    await admin.auth.signOut();
  });
});
