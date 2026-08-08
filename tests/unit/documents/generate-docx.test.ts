import { readFileSync } from 'node:fs';
import path from 'node:path';

import PizZip from 'pizzip';
import { describe, expect, it } from 'vitest';

import {
  ADVISOR_EMAIL,
  ADVISOR_NAME,
  generateCoveringLetterDocx,
  generateParentalConsentDocx,
} from '@/lib/documents';
import { renderMergedBody } from '@/lib/documents/render-body';
import type { VariantId, WizardAnswers } from '@/lib/documents/types';

const FIXTURE_DIR = path.join(process.cwd(), 'tests', 'unit', 'documents', 'fixtures');

const COVERING_VARIANTS: VariantId[] = [
  'covering_skw_solo',
  'covering_skw_with_spouse_dep',
  'covering_fm_partner_dep',
  'covering_nat_family',
  'covering_skd_outside_uk',
];

type RenderFixture = {
  answers: WizardAnswers;
  expectedSubstrings: string[];
};

function loadFixture(variantId: VariantId): RenderFixture {
  const raw = readFileSync(path.join(FIXTURE_DIR, `${variantId}.json`), 'utf8');
  return JSON.parse(raw) as RenderFixture;
}

function extractDocxPlainText(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const documentXml = zip.file('word/document.xml')?.asText() ?? '';
  const raw = [...documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((match) => match[1])
    .join('');

  return raw
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function expectValidDocxBuffer(buffer: Buffer): void {
  expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');
  expect(() => new PizZip(buffer)).not.toThrow();
}

describe('generateCoveringLetterDocx', () => {
  it.each(COVERING_VARIANTS)('produces a letterhead DOCX for %s', async (variantId) => {
    const fixture = loadFixture(variantId);
    const { mergedText } = renderMergedBody(variantId, fixture.answers);
    const { buffer, filename } = await generateCoveringLetterDocx(mergedText);

    expect(filename).toBe('covering-letter.docx');
    expectValidDocxBuffer(buffer);

    const plainText = extractDocxPlainText(buffer);
    for (const substring of fixture.expectedSubstrings) {
      expect(plainText).toContain(substring);
    }

    expect(plainText).toContain('Sincerely');
    expect(plainText).toContain(ADVISOR_NAME);
    expect(plainText).toContain(ADVISOR_EMAIL);
    expect(plainText).not.toContain('{{body}}');
  });

  it('honours a custom filename', async () => {
    const fixture = loadFixture('covering_skw_solo');
    const { mergedText } = renderMergedBody('covering_skw_solo', fixture.answers);
    const { filename } = await generateCoveringLetterDocx(mergedText, {
      filename: 'custom-covering.docx',
    });

    expect(filename).toBe('custom-covering.docx');
  });
});

describe('generateParentalConsentDocx', () => {
  it('produces a plain DOCX from merged parental consent text', async () => {
    const fixture = loadFixture('parental_consent_straightforward');
    const { mergedText } = renderMergedBody(
      'parental_consent_straightforward',
      fixture.answers,
    );
    const { buffer, filename } = await generateParentalConsentDocx(mergedText);

    expect(filename).toBe('parental-consent.docx');
    expectValidDocxBuffer(buffer);

    const plainText = extractDocxPlainText(buffer);
    for (const substring of fixture.expectedSubstrings) {
      expect(plainText).toContain(substring);
    }

    expect(plainText).not.toContain(ADVISOR_NAME);
    expect(plainText).not.toContain(ADVISOR_EMAIL);
    expect(plainText).not.toContain('Immigration Advis');
  });

  it('honours a custom filename', async () => {
    const fixture = loadFixture('parental_consent_straightforward');
    const { mergedText } = renderMergedBody(
      'parental_consent_straightforward',
      fixture.answers,
    );
    const { filename } = await generateParentalConsentDocx(mergedText, {
      filename: 'custom-parental.docx',
    });

    expect(filename).toBe('custom-parental.docx');
  });
});
