export const RESCHEDULE_NOTE_MAX = 500;

export type RescheduleRequestInput = {
  assignment_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  note?: string | null;
};

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = {
  ok: false;
  message: string;
  details?: Array<{ field?: string; message: string }>;
};

export function parseRescheduleRequestInput(
  input: unknown,
): ValidationSuccess<RescheduleRequestInput> | ValidationFailure {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const body = input as Record<string, unknown>;

  if (typeof body.assignment_id !== 'string' || body.assignment_id.trim().length === 0) {
    return {
      ok: false,
      message: 'assignment_id is required.',
      details: [{ field: 'assignment_id', message: 'assignment_id is required.' }],
    };
  }

  if (typeof body.date !== 'string' || body.date.trim().length === 0) {
    return {
      ok: false,
      message: 'date is required.',
      details: [{ field: 'date', message: 'date is required.' }],
    };
  }

  if (typeof body.start_time !== 'string' || body.start_time.trim().length === 0) {
    return {
      ok: false,
      message: 'start_time is required.',
      details: [{ field: 'start_time', message: 'start_time is required.' }],
    };
  }

  if (typeof body.duration_minutes !== 'number' || !Number.isInteger(body.duration_minutes)) {
    return {
      ok: false,
      message: 'duration_minutes must be an integer.',
      details: [{ field: 'duration_minutes', message: 'duration_minutes must be an integer.' }],
    };
  }

  let note: string | null = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string') {
      return {
        ok: false,
        message: 'note must be a string or null.',
        details: [{ field: 'note', message: 'note must be a string or null.' }],
      };
    }

    const trimmed = body.note.trim();
    if (trimmed.length > RESCHEDULE_NOTE_MAX) {
      return {
        ok: false,
        message: `note must be at most ${RESCHEDULE_NOTE_MAX} characters.`,
        details: [{ field: 'note', message: `note must be at most ${RESCHEDULE_NOTE_MAX} characters.` }],
      };
    }

    note = trimmed.length > 0 ? trimmed : null;
  }

  return {
    ok: true,
    value: {
      assignment_id: body.assignment_id.trim(),
      date: body.date.trim(),
      start_time: body.start_time.trim(),
      duration_minutes: body.duration_minutes,
      note,
    },
  };
}
