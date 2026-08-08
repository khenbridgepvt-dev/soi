import { describe, expect, it } from 'vitest';
import {
  DEPENDANT_RELATIONSHIP_OPTIONS,
  validateDependantName,
  validateDependantRelationship,
} from '@/lib/utils/dependant';

describe('dependant validation (TC-025)', () => {
  it('requires name and relationship', () => {
    expect(validateDependantName('')).toEqual({
      ok: false,
      message: 'Name is required.',
    });
    expect(validateDependantRelationship('')).toEqual({
      ok: false,
      message: 'Relationship is required.',
    });
  });

  it('accepts trimmed name values', () => {
    expect(validateDependantName('  Priya Patel  ')).toEqual({
      ok: true,
      value: 'Priya Patel',
    });
  });

  it('accepts the four allowed relationship values', () => {
    for (const option of DEPENDANT_RELATIONSHIP_OPTIONS) {
      expect(validateDependantRelationship(option.value)).toEqual({
        ok: true,
        value: option.value,
      });
      expect(validateDependantRelationship(`  ${option.value}  `)).toEqual({
        ok: true,
        value: option.value,
      });
    }
  });

  it('rejects invalid relationship values', () => {
    expect(validateDependantRelationship('wife')).toEqual({
      ok: false,
      message: 'Relationship must be spouse, partner, child, or other.',
    });
    expect(validateDependantRelationship('husband')).toEqual({
      ok: false,
      message: 'Relationship must be spouse, partner, child, or other.',
    });
    expect(validateDependantRelationship('invalid')).toEqual({
      ok: false,
      message: 'Relationship must be spouse, partner, child, or other.',
    });
  });
});
