import {
  validateLeadApplicationTypeId,
  validateLeadClientName,
  validateLeadNotes,
} from '@/lib/utils/lead-form';
import { isValidCaseReference } from '@/lib/utils/reference';

export type CasePatchBody = {
  client_first_name?: string;
  client_last_name?: string;
  application_type_id?: string;
  last_date?: string | null;
  appointment_date?: string | null;
  notes?: string | null;
};

export type CasePatchField = keyof CasePatchBody;

export const ADMIN_CASE_PATCH_FIELDS: CasePatchField[] = [
  'client_first_name',
  'client_last_name',
  'application_type_id',
  'last_date',
  'appointment_date',
  'notes',
];

export const STAFF_CASE_PATCH_FIELDS: CasePatchField[] = ['notes'];

export function parseCasePatchBody(body: Record<string, unknown>): {
  ok: true;
  updates: CasePatchBody;
  fields: CasePatchField[];
} | {
  ok: false;
  message: string;
  field?: string;
} {
  const updates: CasePatchBody = {};
  const fields: CasePatchField[] = [];

  if ('client_first_name' in body) {
    const result = validateLeadClientName(String(body.client_first_name ?? ''), 'Client first name');
    if (!result.ok) {
      return { ok: false, message: result.message, field: 'client_first_name' };
    }
    updates.client_first_name = result.value;
    fields.push('client_first_name');
  }

  if ('client_last_name' in body) {
    const result = validateLeadClientName(String(body.client_last_name ?? ''), 'Client last name');
    if (!result.ok) {
      return { ok: false, message: result.message, field: 'client_last_name' };
    }
    updates.client_last_name = result.value;
    fields.push('client_last_name');
  }

  if ('application_type_id' in body) {
    const result = validateLeadApplicationTypeId(
      typeof body.application_type_id === 'string' ? body.application_type_id : undefined,
    );
    if (!result.ok) {
      return { ok: false, message: result.message, field: 'application_type_id' };
    }
    updates.application_type_id = result.value;
    fields.push('application_type_id');
  }

  if ('last_date' in body) {
    if (body.last_date === null) {
      updates.last_date = null;
    } else if (typeof body.last_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.last_date)) {
      updates.last_date = body.last_date;
      fields.push('last_date');
    } else {
      return {
        ok: false,
        message: 'last_date must be a date string (YYYY-MM-DD) or null.',
        field: 'last_date',
      };
    }
  }

  if ('appointment_date' in body) {
    if (body.appointment_date === null) {
      updates.appointment_date = null;
    } else if (typeof body.appointment_date === 'string') {
      const parsed = Date.parse(body.appointment_date);
      if (Number.isNaN(parsed)) {
        return {
          ok: false,
          message: 'appointment_date must be a valid ISO timestamp or null.',
          field: 'appointment_date',
        };
      }
      updates.appointment_date = new Date(parsed).toISOString();
      fields.push('appointment_date');
    } else {
      return {
        ok: false,
        message: 'appointment_date must be a valid ISO timestamp or null.',
        field: 'appointment_date',
      };
    }
  }

  if ('notes' in body) {
    const notesInput =
      body.notes === null || body.notes === undefined ? undefined : String(body.notes);
    const result = validateLeadNotes(notesInput);
    if (!result.ok) {
      return { ok: false, message: result.message, field: 'notes' };
    }
    updates.notes = result.value;
    fields.push('notes');
  }

  if (fields.length === 0) {
    return { ok: false, message: 'No valid fields to update.' };
  }

  return { ok: true, updates, fields };
}

export function validateReferenceEditInput(reference: unknown): {
  ok: true;
  value: string;
} | {
  ok: false;
  message: string;
} {
  if (typeof reference !== 'string') {
    return { ok: false, message: 'reference is required.' };
  }

  const value = reference.trim();
  if (!value) {
    return { ok: false, message: 'reference is required.' };
  }

  if (!isValidCaseReference(value)) {
    return {
      ok: false,
      message: 'Reference must match MMYYNO/TYPE/ABC (e.g. 072604/SKW/MAR).',
    };
  }

  return { ok: true, value };
}

export function staffPatchForbiddenFields(fields: CasePatchField[]): CasePatchField[] {
  return fields.filter((field) => !STAFF_CASE_PATCH_FIELDS.includes(field));
}
