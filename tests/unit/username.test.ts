import { describe, expect, it } from 'vitest';
import {
  deriveUsernameBaseFromEmail,
  disambiguateUsername,
  formatStaffDisplayName,
  formatStaffUsername,
  normalizeUsername,
  suggestUsernameFromEmail,
  validateUsername,
} from '@/lib/staff/username';

describe('username validation (ticket 0041)', () => {
  it('normalizes to lowercase trimmed', () => {
    expect(normalizeUsername('  Asha.Kumar  ')).toBe('asha.kumar');
  });

  it('accepts valid usernames', () => {
    expect(validateUsername('asha.kumar')).toEqual({ ok: true, value: 'asha.kumar' });
    expect(validateUsername('user_1')).toEqual({ ok: true, value: 'user_1' });
    expect(validateUsername('abc')).toEqual({ ok: true, value: 'abc' });
  });

  it('rejects too short, too long, and invalid charset', () => {
    expect(validateUsername('ab').ok).toBe(false);
    expect(validateUsername('a'.repeat(31)).ok).toBe(false);
    expect(validateUsername('-bad').ok).toBe(false);
    expect(validateUsername('bad name').ok).toBe(false);
  });

  it('normalizes uppercase input to lowercase', () => {
    expect(validateUsername('Asha')).toEqual({ ok: true, value: 'asha' });
  });
});

describe('username helpers', () => {
  it('derives base from email local-part', () => {
    expect(deriveUsernameBaseFromEmail('asha.kumar@firm.com')).toBe('asha.kumar');
    expect(deriveUsernameBaseFromEmail('!!!@firm.com')).toBe('user');
  });

  it('suggests username from email', () => {
    expect(suggestUsernameFromEmail('staff@firm.com')).toBe('staff');
  });

  it('disambiguates with numeric suffix', () => {
    expect(disambiguateUsername('asha.kumar', 2)).toBe('asha.kumar2');
  });

  it('formats display strings', () => {
    expect(formatStaffUsername('asha')).toBe('@asha');
    expect(formatStaffDisplayName('Asha Kumar', 'asha')).toBe('Asha Kumar (@asha)');
  });
});
