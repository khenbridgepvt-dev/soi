import { describe, expect, it } from 'vitest';
import {
  formatCaseReference,
  formatCaseReferencePreview,
  formatNameSegment,
  formatYearMonth,
  isValidCaseReference,
  parseCaseReference,
} from '@/lib/utils/reference';

describe('formatYearMonth', () => {
  it('formats as MMYY', () => {
    expect(formatYearMonth(new Date('2026-07-04T16:00:00Z'))).toBe('0726');
    expect(formatYearMonth(new Date('2026-01-15T00:00:00Z'))).toBe('0126');
  });

  it('rolls over at the end of a month and of a year', () => {
    expect(formatYearMonth(new Date('2026-11-30T23:59:59Z'))).toBe('1126');
    expect(formatYearMonth(new Date('2026-12-01T00:00:00Z'))).toBe('1226');
    expect(formatYearMonth(new Date('2026-12-31T23:59:59Z'))).toBe('1226');
    expect(formatYearMonth(new Date('2027-01-01T00:00:00Z'))).toBe('0127');
  });

  it('uses UTC so the counter month matches the database', () => {
    // 23:30 on 31 July in UTC+2 is still July for the database (UTC).
    expect(formatYearMonth(new Date('2026-07-31T23:30:00Z'))).toBe('0726');
    expect(formatYearMonth(new Date('2026-08-01T00:30:00Z'))).toBe('0826');
  });
});

describe('formatNameSegment', () => {
  it('takes the first three characters, uppercased', () => {
    expect(formatNameSegment('Mariya')).toBe('MAR');
    expect(formatNameSegment('sakura')).toBe('SAK');
  });

  it('pads names shorter than three characters with X', () => {
    expect(formatNameSegment('Li')).toBe('LIX');
    expect(formatNameSegment('A')).toBe('AXX');
  });

  it('ignores whitespace and punctuation', () => {
    expect(formatNameSegment('  Jo Ann  ')).toBe('JOA');
    expect(formatNameSegment("O'Brien")).toBe('OBR');
    expect(formatNameSegment('Jo-Ann')).toBe('JOA');
    expect(formatNameSegment('')).toBe('XXX');
    expect(formatNameSegment('123')).toBe('XXX');
  });
});

describe('formatCaseReference', () => {
  it('composes MMYY + padded sequence + type code + name segment', () => {
    expect(
      formatCaseReference({
        yearMonth: '0726',
        sequence: 4,
        typeCode: 'SKW',
        clientFirstName: 'Mariya',
      }),
    ).toBe('072604/SKW/MAR');
  });

  it('zero-pads the sequence to two digits and grows beyond', () => {
    const base = { yearMonth: '0726', typeCode: 'GRD', clientFirstName: 'Sakura' };
    expect(formatCaseReference({ ...base, sequence: 1 })).toBe('072601/GRD/SAK');
    expect(formatCaseReference({ ...base, sequence: 9 })).toBe('072609/GRD/SAK');
    expect(formatCaseReference({ ...base, sequence: 10 })).toBe('072610/GRD/SAK');
    expect(formatCaseReference({ ...base, sequence: 100 })).toBe('0726100/GRD/SAK');
  });

  it('uppercases the type code and pads short names', () => {
    expect(
      formatCaseReference({
        yearMonth: '0127',
        sequence: 2,
        typeCode: 'skw',
        clientFirstName: 'Li',
      }),
    ).toBe('012702/SKW/LIX');
  });
});

describe('formatCaseReferencePreview', () => {
  it('shows the sequence as NN until acceptance allocates one', () => {
    expect(
      formatCaseReferencePreview({
        typeCode: 'SKW',
        clientFirstName: 'Mariya',
        at: new Date('2026-07-04T16:00:00Z'),
      }),
    ).toBe('0726NN/SKW/MAR');
  });

  it('applies the same name padding as the real reference', () => {
    expect(
      formatCaseReferencePreview({
        typeCode: 'grd',
        clientFirstName: 'Li',
        at: new Date('2027-01-09T09:00:00Z'),
      }),
    ).toBe('0127NN/GRD/LIX');
  });
});

describe('parseCaseReference', () => {
  it('round-trips a generated reference', () => {
    expect(parseCaseReference('072604/SKW/MAR')).toEqual({
      yearMonth: '0726',
      sequence: 4,
      typeCode: 'SKW',
      nameSegment: 'MAR',
    });
  });

  it('reads sequences longer than two digits', () => {
    expect(parseCaseReference('0726104/GRD/SAK')?.sequence).toBe(104);
  });

  it('returns null for malformed references', () => {
    expect(parseCaseReference('')).toBeNull();
    expect(parseCaseReference('0726/SKW/MAR')).toBeNull();
    expect(parseCaseReference('072604/SKW')).toBeNull();
    expect(parseCaseReference('072604/SKW/MA')).toBeNull();
    expect(parseCaseReference('072604/SK/MAR')).toBeNull();
    expect(parseCaseReference('72604/SKW/MAR')).toBeNull();
    expect(parseCaseReference('072604/SKW/MAR/EXTRA')).toBeNull();
  });
});

describe('isValidCaseReference', () => {
  it('accepts generated references and rejects junk', () => {
    expect(isValidCaseReference('072604/SKW/MAR')).toBe(true);
    expect(isValidCaseReference('072604/skw/mar')).toBe(false);
    expect(isValidCaseReference('not a reference')).toBe(false);
  });
});
