import { describe, expect, it } from 'vitest';
import {
  formatUkOrdinalDate,
  ukOrdinalSuffix,
} from '@/lib/documents/format-date';

describe('formatUkOrdinalDate', () => {
  it('formats ordinal suffixes including teens', () => {
    expect(ukOrdinalSuffix(1)).toBe('st');
    expect(ukOrdinalSuffix(2)).toBe('nd');
    expect(ukOrdinalSuffix(3)).toBe('rd');
    expect(ukOrdinalSuffix(11)).toBe('th');
    expect(ukOrdinalSuffix(12)).toBe('th');
    expect(ukOrdinalSuffix(13)).toBe('th');
    expect(ukOrdinalSuffix(21)).toBe('st');
    expect(ukOrdinalSuffix(22)).toBe('nd');
    expect(ukOrdinalSuffix(23)).toBe('rd');
  });

  it('formats full UK ordinal dates', () => {
    expect(formatUkOrdinalDate(new Date('2026-02-27T12:00:00'))).toBe(
      '27th February 2026',
    );
    expect(formatUkOrdinalDate(new Date('2026-08-03T12:00:00'))).toBe(
      '3rd August 2026',
    );
    expect(formatUkOrdinalDate(new Date('2026-01-01T12:00:00'))).toBe(
      '1st January 2026',
    );
    expect(formatUkOrdinalDate(new Date('2026-01-21T12:00:00'))).toBe(
      '21st January 2026',
    );
  });
});
