import { readFileSync } from 'node:fs';
import path from 'node:path';

import PizZip from 'pizzip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADVISOR_NAME } from '@/lib/documents/constants';
import { fetchCaseDocumentContext } from '@/lib/documents/fetch-case-document-context';
import { generateCaseDocumentDownload } from '@/lib/documents/generate-case-document-download';
import { guardCaseDocumentAccess } from '@/lib/documents/guard-case-document-access';
import { listCaseDocuments } from '@/lib/documents/list-case-documents';
import { upsertCaseDocument } from '@/lib/documents/upsert-case-document';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, signIn, signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const FATIMA_CASE_ID = 'c0000000-0000-4000-8000-000000000004';

const FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'unit',
  'documents',
  'fixtures',
  'covering_skw_solo.json',
);

const service = createServiceClient();
const createdPrepIds: string[] = [];

function loadCoveringSoloFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as {
    answers: Record<string, unknown>;
    expectedSubstrings: string[];
  };
}

function extractDocxPlainText(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const documentXml = zip.file('word/document.xml')?.asText() ?? '';
  return [...documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((match) => match[1])
    .join('');
}

describe('case documents API lib (ticket 0059)', () => {
  beforeAll(async () => {
    await service
      .from('case_document_preparations')
      .delete()
      .in('case_id', [VISHNU_CASE_ID, FATIMA_CASE_ID]);
  });

  afterAll(async () => {
    if (createdPrepIds.length > 0) {
      await service.from('case_document_preparations').delete().in('id', createdPrepIds);
    }
  });

  it('admin upsert covering letter on Vishnu case creates merged_text', async () => {
    const fixture = loadCoveringSoloFixture();
    const { client: admin, userId } = await signInAsRole('admin');
    const context = await fetchCaseDocumentContext(admin, VISHNU_CASE_ID);

    expect(context).not.toBeNull();

    const result = await upsertCaseDocument(
      admin,
      context!,
      userId,
      'covering_letter',
      {
        variant_id: 'covering_skw_solo',
        answers: fixture.answers,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    for (const substring of fixture.expectedSubstrings) {
      expect(result.data.merged_text).toContain(substring);
    }

    const { data: row } = await admin
      .from('case_document_preparations')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('kind', 'covering_letter')
      .single();

    createdPrepIds.push(row!.id);
    await admin.auth.signOut();
  });

  it('upsert same kind again overwrites the existing row', async () => {
    const fixture = loadCoveringSoloFixture();
    const { client: admin, userId } = await signInAsRole('admin');
    const context = await fetchCaseDocumentContext(admin, VISHNU_CASE_ID);

    const first = await upsertCaseDocument(admin, context!, userId, 'covering_letter', {
      variant_id: 'covering_skw_solo',
      answers: fixture.answers,
    });
    expect(first.ok).toBe(true);

    const second = await upsertCaseDocument(admin, context!, userId, 'covering_letter', {
      variant_id: 'covering_skw_solo',
      answers: {
        ...fixture.answers,
        applicant_name: 'Updated Applicant',
      },
    });

    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }

    expect(second.data.merged_text).toContain('Updated Applicant');

    const rows = await listCaseDocuments(admin, VISHNU_CASE_ID);
    expect(rows.filter((row) => row.kind === 'covering_letter')).toHaveLength(1);

    await admin.auth.signOut();
  });

  it('assigned staff can upsert on Vishnu case', async () => {
    const fixture = loadCoveringSoloFixture();
    const { client: staff, userId } = await signInAsRole('staff');
    const context = await fetchCaseDocumentContext(staff, VISHNU_CASE_ID);

    const result = await upsertCaseDocument(staff, context!, userId, 'covering_letter', {
      variant_id: 'covering_skw_solo',
      answers: fixture.answers,
    });

    expect(result.ok).toBe(true);
    await staff.auth.signOut();
  });

  it('unassigned staff cannot upsert on Fatima case', async () => {
    const fixture = loadCoveringSoloFixture();
    const { client: admin, userId: adminId } = await signInAsRole('admin');
    const adminContext = await fetchCaseDocumentContext(admin, FATIMA_CASE_ID);

    await upsertCaseDocument(admin, adminContext!, adminId, 'covering_letter', {
      variant_id: 'covering_skw_solo',
      answers: fixture.answers,
    });

    const { data: seeded } = await admin
      .from('case_document_preparations')
      .select('id, merged_text')
      .eq('case_id', FATIMA_CASE_ID)
      .eq('kind', 'covering_letter')
      .single();

    createdPrepIds.push(seeded!.id);
    await admin.auth.signOut();

    const { client: otherStaff } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);
    const { data: userData } = await otherStaff.auth.getUser();
    const visibleContext = await fetchCaseDocumentContext(otherStaff, FATIMA_CASE_ID);

    expect(visibleContext).toBeNull();

    const result = await upsertCaseDocument(
      otherStaff,
      adminContext!,
      userData.user!.id,
      'covering_letter',
      {
        variant_id: 'covering_skw_solo',
        answers: {
          ...fixture.answers,
          applicant_name: 'Blocked Staff Applicant',
        },
      },
    );

    expect(result.ok).toBe(false);

    const { data: row } = await service
      .from('case_document_preparations')
      .select('merged_text')
      .eq('case_id', FATIMA_CASE_ID)
      .eq('kind', 'covering_letter')
      .single();

    expect(row?.merged_text).not.toContain('Blocked Staff Applicant');
    await otherStaff.auth.signOut();
  });

  it('generate-case-document-download returns DOCX with advisor block for covering letter', async () => {
    const fixture = loadCoveringSoloFixture();
    const { client: admin, userId } = await signInAsRole('admin');
    const context = await fetchCaseDocumentContext(admin, VISHNU_CASE_ID);

    await upsertCaseDocument(admin, context!, userId, 'covering_letter', {
      variant_id: 'covering_skw_solo',
      answers: fixture.answers,
    });

    const result = await generateCaseDocumentDownload(
      admin,
      context!,
      'covering_letter',
      'docx',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.buffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(extractDocxPlainText(result.data.buffer)).toContain(ADVISOR_NAME);
    expect(result.data.filename).toBe('072601-SKW-VIS-covering-letter.docx');

    await admin.auth.signOut();
  });

  it('generate-case-document-download returns PDF for covering letter', async () => {
    const fixture = loadCoveringSoloFixture();
    const { client: admin, userId } = await signInAsRole('admin');
    const context = await fetchCaseDocumentContext(admin, VISHNU_CASE_ID);

    await upsertCaseDocument(admin, context!, userId, 'covering_letter', {
      variant_id: 'covering_skw_solo',
      answers: fixture.answers,
    });

    const result = await generateCaseDocumentDownload(
      admin,
      context!,
      'covering_letter',
      'pdf',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    await admin.auth.signOut();
  });

  it('rejects parental consent upsert when case has no child dependant', async () => {
    const { client: admin, userId } = await signInAsRole('admin');
    const context = await fetchCaseDocumentContext(admin, VISHNU_CASE_ID);

    const result = await upsertCaseDocument(admin, context!, userId, 'parental_consent', {
      variant_id: 'parental_consent_straightforward',
      answers: {
        child_name: 'Amy Doe',
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(400);

    const { data: rows } = await admin
      .from('case_document_preparations')
      .select('id')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('kind', 'parental_consent');

    expect(rows ?? []).toHaveLength(0);
    await admin.auth.signOut();
  });

  it('internal case is hidden from document context and route guard', async () => {
    const { client: admin } = await signInAsRole('admin');

    const context = await fetchCaseDocumentContext(admin, INTERNAL_CASE_ID);
    expect(context).toBeNull();

    const guard = await guardCaseDocumentAccess(admin, INTERNAL_CASE_ID);
    expect(guard.ok).toBe(false);
    if (guard.ok) {
      return;
    }

    expect(guard.response.status).toBe(404);

    await admin.auth.signOut();
  });
});
