import { describe, expect, it } from 'vitest';
import {
  validateProfileRoleUpdate,
  validateStaffEmail,
  validateStaffFullName,
  validateStaffPassword,
  validateStaffRole,
} from '@/lib/staff/validation';

describe('validateStaffFullName', () => {
  it('accepts a trimmed name', () => {
    expect(validateStaffFullName('  Asha Kumar  ')).toEqual({
      ok: true,
      value: 'Asha Kumar',
    });
  });

  it('rejects empty names', () => {
    const result = validateStaffFullName('   ');
    expect(result.ok).toBe(false);
  });
});

describe('validateStaffEmail', () => {
  it('normalizes email to lowercase', () => {
    expect(validateStaffEmail('Asha@Firm.com')).toEqual({
      ok: true,
      value: 'asha@firm.com',
    });
  });

  it('rejects invalid email', () => {
    expect(validateStaffEmail('not-an-email').ok).toBe(false);
  });
});

describe('validateStaffRole', () => {
  it('accepts staff and senior only', () => {
    expect(validateStaffRole('staff').ok).toBe(true);
    expect(validateStaffRole('senior').ok).toBe(true);
    expect(validateStaffRole('admin').ok).toBe(false);
  });
});

describe('validateStaffPassword', () => {
  it('requires minimum length by default', () => {
    expect(validateStaffPassword('short').ok).toBe(false);
    expect(validateStaffPassword('longenough').ok).toBe(true);
  });

  it('enforces complexity when requested', () => {
    expect(validateStaffPassword('alllowercase1', { requireComplexity: true }).ok).toBe(false);
    expect(validateStaffPassword('GoodPass1', { requireComplexity: true }).ok).toBe(true);
  });
});

describe('validateProfileRoleUpdate', () => {
  it('allows admin, staff, and senior', () => {
    expect(validateProfileRoleUpdate('admin').ok).toBe(true);
    expect(validateProfileRoleUpdate('staff').ok).toBe(true);
    expect(validateProfileRoleUpdate('senior').ok).toBe(true);
  });
});
