import type { SupabaseClient } from '@supabase/supabase-js';
import { isInternalCaseId } from '@/lib/cases/internal-case';
import {
  buildTaskReminderUpdate,
  parseTaskPatch,
  type TaskPatchInput,
  type TaskReminderValues,
  validateTaskReminderValues,
} from '@/lib/utils/task-reminder';
import type { Database } from '@/types/database';
import { isUuid } from '@/lib/utils/lead-form';

export const PERSONAL_TASK_TITLE_MAX = 200;
export const PERSONAL_TASK_NOTES_MAX = 500;

export type PersonalTaskReminderValues = TaskReminderValues;

export type PersonalTaskCreateInput = {
  title: string;
  notes?: string | null;
  case_id?: string | null;
  reminder_date?: string | null;
  reminder_note?: string | null;
  deadline_date?: string | null;
  remind_days_before?: number | null;
};

export type PersonalTaskPatchInput = {
  title?: string;
  notes?: string | null;
  case_id?: string | null;
  reminder_date?: string | null;
  reminder_note?: string | null;
  deadline_date?: string | null;
  remind_days_before?: number | null;
};

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = {
  ok: false;
  message: string;
  details?: Array<{ field?: string; message: string }>;
};

export function validatePersonalTaskTitle(
  value: unknown,
): ValidationSuccess<string> | ValidationFailure {
  if (typeof value !== 'string') {
    return {
      ok: false,
      message: 'title is required.',
      details: [{ field: 'title', message: 'title must be a string.' }],
    };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      message: 'title is required.',
      details: [{ field: 'title', message: 'title cannot be blank.' }],
    };
  }

  if (trimmed.length > PERSONAL_TASK_TITLE_MAX) {
    return {
      ok: false,
      message: `title must be at most ${PERSONAL_TASK_TITLE_MAX} characters.`,
      details: [{ field: 'title', message: `title must be at most ${PERSONAL_TASK_TITLE_MAX} characters.` }],
    };
  }

  return { ok: true, value: trimmed };
}

export function validatePersonalTaskNotes(
  value: unknown,
): ValidationSuccess<string | null> | ValidationFailure {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return {
      ok: false,
      message: 'notes must be a string or null.',
      details: [{ field: 'notes', message: 'notes must be a string or null.' }],
    };
  }

  const trimmed = value.trim();
  if (trimmed.length > PERSONAL_TASK_NOTES_MAX) {
    return {
      ok: false,
      message: `notes must be at most ${PERSONAL_TASK_NOTES_MAX} characters.`,
      details: [{ field: 'notes', message: `notes must be at most ${PERSONAL_TASK_NOTES_MAX} characters.` }],
    };
  }

  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

export function parseNullableCaseId(
  value: unknown,
): ValidationSuccess<string | null> | ValidationFailure {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string' || !isUuid(value)) {
    return {
      ok: false,
      message: 'case_id must be a valid UUID or null.',
      details: [{ field: 'case_id', message: 'case_id must be a valid UUID or null.' }],
    };
  }

  return { ok: true, value: value };
}

export async function assertPersonalTaskCaseLink(
  client: SupabaseClient<Database>,
  userId: string,
  caseId: string | null,
): Promise<{ ok: true } | ValidationFailure> {
  if (!caseId) {
    return { ok: true };
  }

  if (isInternalCaseId(caseId)) {
    return { ok: true };
  }

  const { data: caseRow, error: caseError } = await client
    .from('cases')
    .select('id, status, is_deleted, is_internal')
    .eq('id', caseId)
    .maybeSingle();

  if (caseError) {
    return { ok: false, message: 'Failed to validate case link.' };
  }

  if (!caseRow || caseRow.is_deleted || caseRow.status !== 'active' || caseRow.is_internal) {
    return {
      ok: false,
      message: 'case_id must reference an active client case you are assigned to.',
      details: [{ field: 'case_id', message: 'Invalid or inaccessible case.' }],
    };
  }

  const { count, error: assignmentError } = await client
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', caseId)
    .eq('assigned_to', userId)
    .eq('is_deleted', false);

  if (assignmentError) {
    return { ok: false, message: 'Failed to validate case assignment.' };
  }

  if (!count) {
    return {
      ok: false,
      message: 'case_id must reference an active client case you are assigned to.',
      details: [{ field: 'case_id', message: 'You are not assigned to this case.' }],
    };
  }

  return { ok: true };
}

function emptyReminderValues(): PersonalTaskReminderValues {
  return {
    reminder_date: null,
    reminder_note: null,
    deadline_date: null,
    remind_days_before: null,
  };
}

function buildReminderPatchInput(body: Record<string, unknown>): TaskPatchInput {
  const patch: TaskPatchInput = {};

  if ('reminder_date' in body) {
    patch.reminder_date = body.reminder_date;
  }
  if ('reminder_note' in body) {
    patch.reminder_note = body.reminder_note;
  }
  if ('deadline_date' in body) {
    patch.deadline_date = body.deadline_date;
  }
  if ('remind_days_before' in body) {
    patch.remind_days_before = body.remind_days_before;
  }

  return patch;
}

export function parsePersonalTaskCreateInput(
  input: unknown,
): ValidationSuccess<PersonalTaskCreateInput> | ValidationFailure {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const body = input as Record<string, unknown>;
  const titleResult = validatePersonalTaskTitle(body.title);
  if (!titleResult.ok) {
    return titleResult;
  }

  const notesResult = validatePersonalTaskNotes(body.notes);
  if (!notesResult.ok) {
    return notesResult;
  }

  const caseResult = parseNullableCaseId(body.case_id);
  if (!caseResult.ok) {
    return caseResult;
  }

  const hasReminderInput =
    'reminder_date' in body ||
    'reminder_note' in body ||
    'deadline_date' in body ||
    'remind_days_before' in body;

  let reminderValues = emptyReminderValues();

  if (hasReminderInput) {
    const reminderParsed = parseTaskPatch(buildReminderPatchInput(body));

    if (!reminderParsed.ok) {
      return reminderParsed;
    }

    reminderValues = {
      ...emptyReminderValues(),
      ...reminderParsed.value.reminder,
    };
  }

  const reminderValidation = validateTaskReminderValues(reminderValues);
  if (!reminderValidation.ok) {
    return reminderValidation;
  }

  return {
    ok: true,
    value: {
      title: titleResult.value,
      notes: notesResult.value,
      case_id: caseResult.value,
      ...reminderValidation.value,
    },
  };
}

export function parsePersonalTaskPatchInput(
  input: unknown,
  current: PersonalTaskReminderValues,
): ValidationSuccess<PersonalTaskPatchInput> | ValidationFailure {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const body = input as Record<string, unknown>;
  const patch: PersonalTaskPatchInput = {};

  if ('title' in body) {
    const titleResult = validatePersonalTaskTitle(body.title);
    if (!titleResult.ok) {
      return titleResult;
    }
    patch.title = titleResult.value;
  }

  if ('notes' in body) {
    const notesResult = validatePersonalTaskNotes(body.notes);
    if (!notesResult.ok) {
      return notesResult;
    }
    patch.notes = notesResult.value;
  }

  if ('case_id' in body) {
    const caseResult = parseNullableCaseId(body.case_id);
    if (!caseResult.ok) {
      return caseResult;
    }
    patch.case_id = caseResult.value;
  }

  const hasReminderField =
    'reminder_date' in body ||
    'reminder_note' in body ||
    'deadline_date' in body ||
    'remind_days_before' in body;

  if (hasReminderField) {
    const reminderPatch: Partial<PersonalTaskReminderValues> = {};
    if ('reminder_date' in body) {
      reminderPatch.reminder_date = body.reminder_date as string | null;
    }
    if ('reminder_note' in body) {
      reminderPatch.reminder_note = body.reminder_note as string | null;
    }
    if ('deadline_date' in body) {
      reminderPatch.deadline_date = body.deadline_date as string | null;
    }
    if ('remind_days_before' in body) {
      reminderPatch.remind_days_before = body.remind_days_before as number | null;
    }

    const reminderValidation = buildTaskReminderUpdate(current, reminderPatch);
    if (!reminderValidation.ok) {
      return reminderValidation;
    }

    Object.assign(patch, reminderValidation.value);
  }

  if (Object.keys(patch).length === 0) {
    return {
      ok: false,
      message:
        'At least one of title, notes, case_id, reminder_date, reminder_note, deadline_date, or remind_days_before is required.',
    };
  }

  return { ok: true, value: patch };
}
