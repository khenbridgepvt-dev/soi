import { isValidISODate } from '@/lib/utils/dates';
import { validateTaskNotes } from '@/lib/utils/task-notes';

export const TASK_REMINDER_NOTE_MAX = 500;

export type TaskReminderValues = {
  reminder_date: string | null;
  reminder_note: string | null;
  deadline_date: string | null;
  remind_days_before: number | null;
};

export type TaskPatchInput = {
  notes?: unknown;
  reminder_date?: unknown;
  reminder_note?: unknown;
  deadline_date?: unknown;
  remind_days_before?: unknown;
};

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = {
  ok: false;
  message: string;
  details?: Array<{ field?: string; message: string }>;
};

function parseNullableDate(
  value: unknown,
  field: string,
): ValidationSuccess<string | null> | ValidationFailure {
  if (value === undefined) {
    return { ok: false, message: `${field} must be provided to update.`, details: [{ field, message: 'Missing field.' }] };
  }

  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string' || !isValidISODate(value)) {
    return {
      ok: false,
      message: `${field} must be a valid YYYY-MM-DD date or null.`,
      details: [{ field, message: 'Must be YYYY-MM-DD or null.' }],
    };
  }

  return { ok: true, value: value };
}

function parseNullableReminderNote(
  value: unknown,
): ValidationSuccess<string | null> | ValidationFailure {
  if (value === undefined) {
    return { ok: false, message: 'reminder_note must be provided to update.' };
  }

  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { ok: false, message: 'reminder_note must be a string or null.' };
  }

  if (value.length > TASK_REMINDER_NOTE_MAX) {
    return {
      ok: false,
      message: `reminder_note must be at most ${TASK_REMINDER_NOTE_MAX} characters.`,
    };
  }

  const trimmed = value.trim();
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

function parseNullableRemindDaysBefore(
  value: unknown,
): ValidationSuccess<number | null> | ValidationFailure {
  if (value === undefined) {
    return { ok: false, message: 'remind_days_before must be provided to update.' };
  }

  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return {
      ok: false,
      message: 'remind_days_before must be a non-negative integer or null.',
    };
  }

  return { ok: true, value: value };
}

export function validateTaskReminderValues(
  values: TaskReminderValues,
): ValidationSuccess<TaskReminderValues> | ValidationFailure {
  if (values.reminder_note && values.reminder_note.length > TASK_REMINDER_NOTE_MAX) {
    return {
      ok: false,
      message: `reminder_note must be at most ${TASK_REMINDER_NOTE_MAX} characters.`,
    };
  }

  if (values.remind_days_before !== null && values.remind_days_before < 0) {
    return {
      ok: false,
      message: 'remind_days_before must be zero or greater.',
    };
  }

  if (values.remind_days_before !== null && !values.deadline_date) {
    return {
      ok: false,
      message: 'deadline_date is required when remind_days_before is set.',
      details: [{ field: 'deadline_date', message: 'deadline_date is required.' }],
    };
  }

  if (values.reminder_note && !values.reminder_date) {
    return {
      ok: false,
      message: 'reminder_date is required when reminder_note is set.',
      details: [{ field: 'reminder_date', message: 'reminder_date is required.' }],
    };
  }

  return { ok: true, value: values };
}

export function mergeTaskReminderPatch(
  current: TaskReminderValues,
  patch: Partial<TaskReminderValues>,
): TaskReminderValues {
  const reminder_date =
    patch.reminder_date !== undefined ? patch.reminder_date : current.reminder_date;
  let reminder_note =
    patch.reminder_note !== undefined ? patch.reminder_note : current.reminder_note;
  const deadline_date =
    patch.deadline_date !== undefined ? patch.deadline_date : current.deadline_date;
  let remind_days_before =
    patch.remind_days_before !== undefined
      ? patch.remind_days_before
      : current.remind_days_before;

  if (patch.reminder_date === null) {
    reminder_note = null;
  }

  if (patch.deadline_date === null) {
    remind_days_before = null;
  }

  return {
    reminder_date,
    reminder_note,
    deadline_date,
    remind_days_before,
  };
}

export type ParsedTaskPatch = {
  notes?: string | null;
  reminder?: Partial<TaskReminderValues>;
};

export function parseTaskPatch(
  input: TaskPatchInput,
): ValidationSuccess<ParsedTaskPatch> | ValidationFailure {
  const hasNotes = 'notes' in input;
  const hasReminderDate = 'reminder_date' in input;
  const hasReminderNote = 'reminder_note' in input;
  const hasDeadlineDate = 'deadline_date' in input;
  const hasRemindDaysBefore = 'remind_days_before' in input;

  if (
    !hasNotes &&
    !hasReminderDate &&
    !hasReminderNote &&
    !hasDeadlineDate &&
    !hasRemindDaysBefore
  ) {
    return {
      ok: false,
      message: 'At least one of notes, reminder_date, reminder_note, deadline_date, or remind_days_before is required.',
    };
  }

  const result: ParsedTaskPatch = {};

  if (hasNotes) {
    if (typeof input.notes !== 'string') {
      return {
        ok: false,
        message: 'notes must be a string.',
        details: [{ field: 'notes', message: 'Must be a string.' }],
      };
    }

    const notesResult = validateTaskNotes(input.notes);
    if (!notesResult.ok) {
      return { ok: false, message: notesResult.message, details: [{ field: 'notes', message: notesResult.message }] };
    }
    result.notes = notesResult.value;
  }

  const reminder: Partial<TaskReminderValues> = {};

  if (hasReminderDate) {
    const parsed = parseNullableDate(input.reminder_date, 'reminder_date');
    if (!parsed.ok) {
      return parsed;
    }
    reminder.reminder_date = parsed.value;
  }

  if (hasReminderNote) {
    const parsed = parseNullableReminderNote(input.reminder_note);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message, details: [{ field: 'reminder_note', message: parsed.message }] };
    }
    reminder.reminder_note = parsed.value;
  }

  if (hasDeadlineDate) {
    const parsed = parseNullableDate(input.deadline_date, 'deadline_date');
    if (!parsed.ok) {
      return parsed;
    }
    reminder.deadline_date = parsed.value;
  }

  if (hasRemindDaysBefore) {
    const parsed = parseNullableRemindDaysBefore(input.remind_days_before);
    if (!parsed.ok) {
      return {
        ok: false,
        message: parsed.message,
        details: [{ field: 'remind_days_before', message: parsed.message }],
      };
    }
    reminder.remind_days_before = parsed.value;
  }

  if (Object.keys(reminder).length > 0) {
    result.reminder = reminder;
  }

  return { ok: true, value: result };
}

export function buildTaskReminderUpdate(
  current: TaskReminderValues,
  patch: Partial<TaskReminderValues>,
): ValidationSuccess<TaskReminderValues> | ValidationFailure {
  const merged = mergeTaskReminderPatch(current, patch);
  return validateTaskReminderValues(merged);
}
