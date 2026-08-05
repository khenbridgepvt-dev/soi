import { describe, expect, it } from 'vitest';
import {
  APPLICATION_TYPE_CODE_FORMAT_ERROR,
  isValidApplicationTypeCode,
  normalizeApplicationTypeCode,
  validateApplicationTypeCode,
  validateApplicationTypeName,
} from '@/lib/utils/application-type';

describe('application type code validation (TC-015)', () => {
  it.each([
    ['SKW', true],
    ['SKD', true],
    ['ANC', true],
    ['sk', false],
    ['SK1', false],
    ['SKWA', false],
    ['', false],
    ['skw', false],
  ])('isValidApplicationTypeCode("%s") → %s', (code, expected) => {
    expect(isValidApplicationTypeCode(code)).toBe(expected);
  });

  it('normalizes input to uppercase', () => {
    expect(normalizeApplicationTypeCode('skw')).toBe('SKW');
  });

  it('rejects lowercase 2-char code', () => {
    const result = validateApplicationTypeCode('sk');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(APPLICATION_TYPE_CODE_FORMAT_ERROR);
    }
  });

  it('rejects code with digit', () => {
    const result = validateApplicationTypeCode('SK1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(APPLICATION_TYPE_CODE_FORMAT_ERROR);
    }
  });

  it('accepts valid code', () => {
    const result = validateApplicationTypeCode('anc');
    expect(result).toEqual({ ok: true, code: 'ANC' });
  });
});

describe('application type name validation', () => {
  it('rejects names shorter than 2 characters', () => {
    const result = validateApplicationTypeName('A');
    expect(result.ok).toBe(false);
  });

  it('accepts valid names', () => {
    const result = validateApplicationTypeName('Ancestry Visa');
    expect(result).toEqual({ ok: true, name: 'Ancestry Visa' });
  });
});
