import { describe, expect, it } from 'vitest';
import {
  canOfferParentalConsent,
  listVariantsForKind,
  suggestCoveringVariant,
} from '@/lib/documents/resolve-variant';

describe('resolve-variant', () => {
  it('suggests SKW solo vs SKW with spouse/partner dependant', () => {
    expect(suggestCoveringVariant('SKW', [])).toBe('covering_skw_solo');
    expect(
      suggestCoveringVariant('SKW', [{ name: 'Spouse', relationship: 'spouse' }]),
    ).toBe('covering_skw_with_spouse_dep');
    expect(
      suggestCoveringVariant('SKW', [{ name: 'Partner', relationship: 'partner' }]),
    ).toBe('covering_skw_with_spouse_dep');
    expect(
      suggestCoveringVariant('SKW', [{ name: 'Child', relationship: 'child' }]),
    ).toBe('covering_skw_solo');
  });

  it('suggests FM, SPV, NAT, and SKD_OUT_UK variants', () => {
    expect(suggestCoveringVariant('FM', [])).toBe('covering_fm_partner_dep');
    expect(suggestCoveringVariant('SPV', [])).toBe('covering_fm_partner_dep');
    expect(suggestCoveringVariant('NAT', [])).toBe('covering_nat_family');
    expect(suggestCoveringVariant('SKD_OUT_UK', [])).toBe('covering_skd_outside_uk');
  });

  it('gates parental consent on child dependants', () => {
    expect(canOfferParentalConsent([])).toBe(false);
    expect(
      canOfferParentalConsent([{ name: 'Spouse', relationship: 'spouse' }]),
    ).toBe(false);
    expect(
      canOfferParentalConsent([{ name: 'Child', relationship: 'child' }]),
    ).toBe(true);
  });

  it('lists variants for kind with suggested covering letter first', () => {
    expect(
      listVariantsForKind('covering_letter', {
        applicationTypeCode: 'SKW',
        dependants: [{ name: 'Spouse', relationship: 'spouse' }],
      }),
    ).toEqual([
      'covering_skw_with_spouse_dep',
      'covering_skw_solo',
      'covering_fm_partner_dep',
      'covering_nat_family',
      'covering_skd_outside_uk',
    ]);

    expect(
      listVariantsForKind('parental_consent', {
        applicationTypeCode: 'SKW',
        dependants: [{ name: 'Child', relationship: 'child' }],
      }),
    ).toEqual(['parental_consent_straightforward']);

    expect(
      listVariantsForKind('parental_consent', {
        applicationTypeCode: 'SKW',
        dependants: [],
      }),
    ).toEqual([]);
  });
});
