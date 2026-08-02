import type { Database } from '@/types/database';

export type StaffRole = 'staff' | 'senior';

export const STAFF_FULL_NAME_MAX = 100;
export const STAFF_FULL_NAME_MIN = 1;
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY = /^(?=.*[A-Z])(?=.*\d).+$/;

export function validateStaffFullName(input: string | undefined): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  const value = (input ?? '').trim();

  if (value.length < STAFF_FULL_NAME_MIN) {
    return { ok: false, message: 'Full name is required.' };
  }

  if (value.length > STAFF_FULL_NAME_MAX) {
    return {
      ok: false,
      message: `Full name must be at most ${STAFF_FULL_NAME_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function validateStaffEmail(input: string | undefined): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  const value = (input ?? '').trim().toLowerCase();

  if (!value) {
    return { ok: false, message: 'Email is required.' };
  }

  if (!EMAIL_PATTERN.test(value)) {
    return { ok: false, message: 'Email must be a valid email address.' };
  }

  return { ok: true, value };
}

export function validateStaffRole(input: string | undefined): {
  ok: true;
  value: StaffRole;
} | { ok: false; message: string } {
  if (input === 'staff' || input === 'senior') {
    return { ok: true, value: input };
  }

  return { ok: false, message: 'Role must be staff or senior.' };
}

export function validateStaffPassword(
  input: string | undefined,
  options: { requireComplexity?: boolean } = {},
): { ok: true; value: string } | { ok: false; message: string; code?: string } {
  const value = input ?? '';

  if (value.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      code: 'WEAK_PASSWORD',
    };
  }

  if (options.requireComplexity && !PASSWORD_COMPLEXITY.test(value)) {
    return {
      ok: false,
      message: 'Password must include at least one uppercase letter and one number.',
      code: 'WEAK_PASSWORD',
    };
  }

  return { ok: true, value };
}

export function validateProfileRoleUpdate(
  input: string | undefined,
): {
  ok: true;
  value: Database['public']['Enums']['user_role'];
} | { ok: false; message: string } {
  if (input === 'admin' || input === 'staff' || input === 'senior') {
    return { ok: true, value: input };
  }

  return { ok: false, message: 'Role must be admin, staff, or senior.' };
}
