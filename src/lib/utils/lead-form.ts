export const LEAD_CLIENT_NAME_MIN = 1;
export const LEAD_CLIENT_NAME_MAX = 100;
export const LEAD_NOTES_MAX_UI = 500;
export const LEAD_NOTES_MAX_API = 2000;
export const LEAD_REJECT_REASON_MAX = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function validateLeadClientName(
  input: string,
  fieldLabel: 'Client first name' | 'Client last name',
): { ok: true; value: string } | { ok: false; message: string } {
  const value = input.trim();

  if (value.length < LEAD_CLIENT_NAME_MIN) {
    return {
      ok: false,
      message: `${fieldLabel} is required.`,
    };
  }

  if (value.length > LEAD_CLIENT_NAME_MAX) {
    return {
      ok: false,
      message: `${fieldLabel} must be at most ${LEAD_CLIENT_NAME_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function validateLeadApplicationTypeId(
  input: string | undefined,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = (input ?? '').trim();

  if (!value) {
    return { ok: false, message: 'Application type is required.' };
  }

  if (!isUuid(value)) {
    return { ok: false, message: 'Application type is required.' };
  }

  return { ok: true, value };
}

export function validateLeadNotes(
  input: string | undefined,
  maxLength = LEAD_NOTES_MAX_API,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (!input?.trim()) {
    return { ok: true, value: null };
  }

  const value = input.trim();

  if (value.length > maxLength) {
    return {
      ok: false,
      message: `Notes must be at most ${maxLength} characters.`,
    };
  }

  return { ok: true, value };
}

export function validateRejectReason(
  input: string | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (!input?.trim()) {
    return { ok: true, value: null };
  }

  const value = input.trim();

  if (value.length > LEAD_REJECT_REASON_MAX) {
    return {
      ok: false,
      message: `Reason must be at most ${LEAD_REJECT_REASON_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function isCreateLeadFormComplete(input: {
  clientFirstName: string;
  clientLastName: string;
  applicationTypeId: string;
}): boolean {
  return (
    input.clientFirstName.trim().length >= LEAD_CLIENT_NAME_MIN &&
    input.clientLastName.trim().length >= LEAD_CLIENT_NAME_MIN &&
    isUuid(input.applicationTypeId.trim())
  );
}

export function hasUnsavedLeadFormData(input: {
  clientFirstName: string;
  clientLastName: string;
  applicationTypeId: string;
  notes: string;
}): boolean {
  return (
    input.clientFirstName.trim().length > 0 ||
    input.clientLastName.trim().length > 0 ||
    input.applicationTypeId.trim().length > 0 ||
    input.notes.trim().length > 0
  );
}
