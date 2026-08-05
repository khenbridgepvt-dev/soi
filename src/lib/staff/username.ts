/** Profile username validation (ticket 0041) — display handle, not login. */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function deriveUsernameBaseFromEmail(email: string): string {
  const local = email.split('@')[0]?.toLowerCase() ?? 'user';
  let base = local.replace(/[^a-z0-9._-]/g, '');

  if (!base || !/^[a-z0-9]/.test(base)) {
    base = 'user';
  }

  return base.slice(0, USERNAME_MAX_LENGTH);
}

/** Deterministic backfill base from email (matches migration logic). */
export function suggestUsernameFromEmail(email: string): string {
  return deriveUsernameBaseFromEmail(email);
}

export function disambiguateUsername(base: string, suffix: number): string {
  const suffixText = String(suffix);
  const trimmedBase = base.slice(0, Math.max(1, USERNAME_MAX_LENGTH - suffixText.length));
  return `${trimmedBase}${suffixText}`;
}

export function validateUsername(input: string | undefined): {
  ok: true;
  value: string;
} | {
  ok: false;
  message: string;
} {
  const value = normalizeUsername(input ?? '');

  if (value.length < USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    };
  }

  if (value.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
    };
  }

  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      message: 'Username may use lowercase letters, numbers, dots, underscores, and hyphens.',
    };
  }

  return { ok: true, value };
}

export function formatStaffDisplayName(fullName: string, username: string): string {
  return `${fullName} (@${username})`;
}

export function formatStaffUsername(username: string): string {
  return `@${username}`;
}
