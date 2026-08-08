import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { renderMergedBody } from '@/lib/documents/render-body';
import type { VariantId, WizardAnswers } from '@/lib/documents/types';

const FIXTURE_DIR = path.join(process.cwd(), 'tests', 'unit', 'documents', 'fixtures');

const VARIANT_FIXTURES: VariantId[] = [
  'covering_skw_solo',
  'covering_skw_with_spouse_dep',
  'covering_fm_partner_dep',
  'covering_nat_family',
  'covering_skd_outside_uk',
  'parental_consent_straightforward',
];

type RenderFixture = {
  answers: WizardAnswers;
  expectedSubstrings: string[];
};

function loadFixture(variantId: VariantId): RenderFixture {
  const raw = readFileSync(path.join(FIXTURE_DIR, `${variantId}.json`), 'utf8');
  return JSON.parse(raw) as RenderFixture;
}

describe('renderMergedBody', () => {
  it.each(VARIANT_FIXTURES)('renders %s with expected substrings', (variantId) => {
    const fixture = loadFixture(variantId);
    const { mergedText, mergedHtml } = renderMergedBody(variantId, fixture.answers);

    expect(mergedText.length).toBeGreaterThan(0);
    expect(mergedHtml).toContain('<p>');

    for (const substring of fixture.expectedSubstrings) {
      expect(mergedText).toContain(substring);
    }

    expect(mergedText).not.toContain('{{');
    expect(mergedText).not.toContain('Ephraim Abraham');
  });

  it('omits SKW+dep extension paragraph when is_extension is false', () => {
    const fixture = loadFixture('covering_skw_with_spouse_dep');
    const { mergedText } = renderMergedBody('covering_skw_with_spouse_dep', {
      ...fixture.answers,
      is_extension: false,
    });

    expect(mergedText).not.toContain('Certificate of Sponsorship for extension');
    expect(mergedText).toContain('Mrs Jane Doe');
  });

  it('escapes HTML in mergedHtml output', () => {
    const { mergedHtml } = renderMergedBody('covering_skw_solo', {
      applicant_name: 'John <script>',
      applicant_title: 'Mr',
      uan: '1212-0001-xxxx-xxxx',
      applicant_pronoun_object: 'him',
      applicant_pronoun_possessive: 'his',
      present_date: '2026-08-03',
    });

    expect(mergedHtml).toContain('John &lt;script&gt;');
    expect(mergedHtml).not.toContain('<script>');
  });
});
