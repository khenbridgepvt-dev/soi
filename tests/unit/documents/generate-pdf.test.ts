import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PDFParse } from 'pdf-parse';
import { describe, expect, it } from 'vitest';

import {
  ADVISOR_EMAIL,
  ADVISOR_NAME,
  generateCoveringLetterPdf,
  generateParentalConsentPdf,
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

async function extractPdfPlainText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function normalizePdfText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function expectPdfToContain(plainText: string, substring: string): void {
  expect(normalizePdfText(plainText)).toContain(normalizePdfText(substring));
}

function expectValidPdfBuffer(buffer: Buffer): void {
  expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  expect(buffer.toString('latin1')).toContain('%%EOF');
}

describe('generateCoveringLetterPdf', () => {
  it.each(COVERING_VARIANTS)('produces a plain PDF for %s', async (variantId) => {
    const fixture = loadFixture(variantId);
    const { mergedText } = renderMergedBody(variantId, fixture.answers);
    const { buffer, filename } = await generateCoveringLetterPdf(mergedText);

    expect(filename).toBe('covering-letter.pdf');
    expectValidPdfBuffer(buffer);

    const plainText = await extractPdfPlainText(buffer);
    for (const substring of fixture.expectedSubstrings) {
      expectPdfToContain(plainText, substring);
    }

    expect(plainText).not.toContain(ADVISOR_NAME);
    expect(plainText).not.toContain(ADVISOR_EMAIL);
  });

  it('honours a custom filename', async () => {
    const fixture = loadFixture('covering_skw_solo');
    const { mergedText } = renderMergedBody('covering_skw_solo', fixture.answers);
    const { filename } = await generateCoveringLetterPdf(mergedText, {
      filename: 'custom-covering.pdf',
    });

    expect(filename).toBe('custom-covering.pdf');
  });
});

describe('generateParentalConsentPdf', () => {
  it('produces a plain PDF from merged parental consent text', async () => {
    const fixture = loadFixture('parental_consent_straightforward');
    const { mergedText } = renderMergedBody(
      'parental_consent_straightforward',
      fixture.answers,
    );
    const { buffer, filename } = await generateParentalConsentPdf(mergedText);

    expect(filename).toBe('parental-consent.pdf');
    expectValidPdfBuffer(buffer);

    const plainText = await extractPdfPlainText(buffer);
    for (const substring of fixture.expectedSubstrings) {
      expectPdfToContain(plainText, substring);
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
    const { filename } = await generateParentalConsentPdf(mergedText, {
      filename: 'custom-parental.pdf',
    });

    expect(filename).toBe('custom-parental.pdf');
  });
});
