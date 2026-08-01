import { describe, expect, it } from 'vitest';
import {
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

  it('accepts trimmed values', () => {
    expect(validateDependantName('  Priya Patel  ')).toEqual({
      ok: true,
      value: 'Priya Patel',
    });
    expect(validateDependantRelationship('spouse')).toEqual({
      ok: true,
      value: 'spouse',
    });
  });
});
