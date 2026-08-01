import { describe, expect, it } from 'vitest';
import {
  hasUnsavedLeadFormData,
  isCreateLeadFormComplete,
  LEAD_CLIENT_NAME_MAX,
  validateLeadClientName,
  validateLeadApplicationTypeId,
  validateLeadNotes,
  validateRejectReason,
} from '@/lib/utils/lead-form';

describe('validateLeadClientName', () => {
  it('requires non-empty trimmed name', () => {
    expect(validateLeadClientName('', 'Client first name')).toEqual({
      ok: false,
      message: 'Client first name is required.',
    });
    expect(validateLeadClientName('  ', 'Client last name')).toEqual({
      ok: false,
      message: 'Client last name is required.',
    });
  });

  it('rejects names over 100 characters', () => {
    const longName = 'A'.repeat(LEAD_CLIENT_NAME_MAX + 1);
    const result = validateLeadClientName(longName, 'Client first name');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('100');
    }
  });

  it('accepts valid names', () => {
    expect(validateLeadClientName('Mariya', 'Client first name')).toEqual({
      ok: true,
      value: 'Mariya',
    });
  });
});

describe('validateLeadApplicationTypeId', () => {
  it('requires a uuid', () => {
    expect(validateLeadApplicationTypeId('')).toMatchObject({ ok: false });
    expect(validateLeadApplicationTypeId('not-a-uuid')).toMatchObject({ ok: false });
  });

  it('accepts a valid uuid', () => {
    const id = 'a0000000-0000-4000-8000-000000000003';
    expect(validateLeadApplicationTypeId(id)).toEqual({ ok: true, value: id });
  });
});

describe('validateLeadNotes', () => {
  it('allows empty notes', () => {
    expect(validateLeadNotes('')).toEqual({ ok: true, value: null });
  });

  it('enforces max length', () => {
    const result = validateLeadNotes('x'.repeat(501), 500);
    expect(result.ok).toBe(false);
  });
});

describe('validateRejectReason', () => {
  it('allows empty reason', () => {
    expect(validateRejectReason('')).toEqual({ ok: true, value: null });
  });
});

describe('isCreateLeadFormComplete', () => {
  it('is false until required fields are filled', () => {
    expect(
      isCreateLeadFormComplete({
        clientFirstName: 'Mariya',
        clientLastName: '',
        applicationTypeId: '',
      }),
    ).toBe(false);

    expect(
      isCreateLeadFormComplete({
        clientFirstName: 'Mariya',
        clientLastName: 'Ivanova',
        applicationTypeId: 'a0000000-0000-4000-8000-000000000003',
      }),
    ).toBe(true);
  });
});

describe('hasUnsavedLeadFormData', () => {
  it('detects any entered field', () => {
    expect(
      hasUnsavedLeadFormData({
        clientFirstName: 'A',
        clientLastName: '',
        applicationTypeId: '',
        notes: '',
      }),
    ).toBe(true);
  });
});
