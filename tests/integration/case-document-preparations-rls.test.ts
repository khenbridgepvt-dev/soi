import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, signIn, signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const FATIMA_CASE_ID = 'c0000000-0000-4000-8000-000000000004';
const KIM_LEAD_CASE_ID = 'c0000000-0000-4000-8000-000000000003';

const service = createServiceClient();
const createdPrepIds: string[] = [];

function prepInsert(caseId: string, userId: string, kind: 'covering_letter' | 'parental_consent' = 'covering_letter') {
  return {
    case_id: caseId,
    kind,
    variant_id: 'covering_skw_solo',
    wizard_schema_id: 'wizard_covering_skw_solo',
    answers: { applicant_name: 'Test Applicant' },
    merged_text: 'Merged body',
    created_by: userId,
    updated_by: userId,
  };
}

describe('case_document_preparations RLS (ticket 0055)', () => {
  beforeAll(async () => {
    await service
      .from('case_document_preparations')
      .delete()
      .in('case_id', [VISHNU_CASE_ID, FATIMA_CASE_ID, KIM_LEAD_CASE_ID]);
  });

  afterAll(async () => {
    if (createdPrepIds.length > 0) {
      await service.from('case_document_preparations').delete().in('id', createdPrepIds);
    }
  });

  it('admin can INSERT and SELECT on an active case', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const { data, error } = await admin
      .from('case_document_preparations')
      .insert(prepInsert(VISHNU_CASE_ID, userId))
      .select('id, case_id, kind, variant_id')
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      case_id: VISHNU_CASE_ID,
      kind: 'covering_letter',
      variant_id: 'covering_skw_solo',
    });
    createdPrepIds.push(data!.id);

    const { data: rows, error: selectError } = await admin
      .from('case_document_preparations')
      .select('id')
      .eq('id', data!.id);

    expect(selectError).toBeNull();
    expect(rows).toHaveLength(1);

    await admin.auth.signOut();
  });

  it('assigned staff can INSERT and SELECT on their case', async () => {
    const { client: staff, userId } = await signInAsRole('staff');

    const { data, error } = await staff
      .from('case_document_preparations')
      .insert(prepInsert(VISHNU_CASE_ID, userId, 'parental_consent'))
      .select('id, kind')
      .single();

    expect(error).toBeNull();
    expect(data?.kind).toBe('parental_consent');
    createdPrepIds.push(data!.id);

    const { data: rows, error: selectError } = await staff
      .from('case_document_preparations')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('kind', 'parental_consent');

    expect(selectError).toBeNull();
    expect(rows?.some((row) => row.id === data!.id)).toBe(true);

    await staff.auth.signOut();
  });

  it('unassigned staff cannot SELECT another case row', async () => {
    const { client: admin, userId: adminId } = await signInAsRole('admin');

    const { data: seeded, error: seedError } = await admin
      .from('case_document_preparations')
      .insert(prepInsert(FATIMA_CASE_ID, adminId))
      .select('id')
      .single();

    expect(seedError).toBeNull();
    createdPrepIds.push(seeded!.id);
    await admin.auth.signOut();

    const { client: otherStaff } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const { data: rows, error } = await otherStaff
      .from('case_document_preparations')
      .select('id')
      .eq('id', seeded!.id);

    expect(error).toBeNull();
    expect(rows ?? []).toHaveLength(0);

    const { data: userData } = await otherStaff.auth.getUser();
    const { error: insertError } = await otherStaff
      .from('case_document_preparations')
      .insert(prepInsert(FATIMA_CASE_ID, userData.user!.id));

    expect(insertError).not.toBeNull();

    await otherStaff.auth.signOut();
  });

  it('enforces UNIQUE(case_id, kind)', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const { data: first, error: firstError } = await admin
      .from('case_document_preparations')
      .insert(prepInsert(KIM_LEAD_CASE_ID, userId))
      .select('id')
      .single();

    expect(firstError).toBeNull();
    createdPrepIds.push(first!.id);

    const { error: duplicateError } = await admin
      .from('case_document_preparations')
      .insert(prepInsert(KIM_LEAD_CASE_ID, userId));

    expect(duplicateError).not.toBeNull();
    expect(duplicateError?.message ?? '').toMatch(
      /case_document_preparations_case_kind_unique|duplicate key/i,
    );

    await admin.auth.signOut();
  });
});
