export const CUSTOM_TASK_NAME_MAX = 100;
export const CUSTOM_TASK_ABBREVIATION_MAX = 20;
export const CUSTOM_TASK_DESCRIPTION_MAX = 1000;
export const MAX_CUSTOM_TASKS_PER_CASE = 5;

export const MAX_CUSTOM_TASKS_MESSAGE = 'Maximum of 5 custom tasks allowed per case.';

export function validateCustomTaskName(
  input: string | undefined,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = (input ?? '').trim();

  if (!value) {
    return { ok: false, message: 'Name is required.' };
  }

  if (value.length > CUSTOM_TASK_NAME_MAX) {
    return {
      ok: false,
      message: `Name must be at most ${CUSTOM_TASK_NAME_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function validateCustomTaskAbbreviation(
  input: string | undefined,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = (input ?? '').trim();

  if (!value) {
    return { ok: false, message: 'Abbreviation is required.' };
  }

  if (value.length > CUSTOM_TASK_ABBREVIATION_MAX) {
    return {
      ok: false,
      message: `Abbreviation must be at most ${CUSTOM_TASK_ABBREVIATION_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function validateCustomTaskDescription(
  input: string | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return { ok: true, value: null };
  }

  const value = input.trim();

  if (!value) {
    return { ok: true, value: null };
  }

  if (value.length > CUSTOM_TASK_DESCRIPTION_MAX) {
    return {
      ok: false,
      message: `Description must be at most ${CUSTOM_TASK_DESCRIPTION_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function isCustomTaskLimitExceeded(count: number): boolean {
  return count >= MAX_CUSTOM_TASKS_PER_CASE;
}

/** Derives a short abbreviation from a task name (ticket 0044 ad-hoc flow). */
export function deriveCustomTaskAbbreviation(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'TASK';
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean)
      .map((word) => word[0]!.toUpperCase())
      .join('');

    if (initials.length >= 2) {
      return initials.slice(0, CUSTOM_TASK_ABBREVIATION_MAX);
    }
  }

  const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (alnum.length >= 2) {
    return alnum.slice(0, Math.min(8, CUSTOM_TASK_ABBREVIATION_MAX)).toUpperCase();
  }

  return trimmed.slice(0, CUSTOM_TASK_ABBREVIATION_MAX).toUpperCase();
}

const TASK_NOTES_MAX = 500;

export function appendTaskAuditNote(
  existing: string | null | undefined,
  line: string,
): string {
  const next = existing?.trim() ? `${existing.trim()}\n${line}` : line;
  if (next.length <= TASK_NOTES_MAX) {
    return next;
  }

  const trimmedExisting = existing?.trim() ?? '';
  const room = TASK_NOTES_MAX - line.length - 1;
  if (room <= 0) {
    return line.slice(0, TASK_NOTES_MAX);
  }

  const kept = trimmedExisting.slice(-room);
  return kept ? `${kept}\n${line}` : line.slice(0, TASK_NOTES_MAX);
}

export function formatAdhocAuditNoteLine(input: {
  timestamp: Date;
  staffName: string;
  taskName: string;
  description?: string | null;
}): string {
  const when = input.timestamp.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const base = `[${when}] ${input.staffName} — ${input.taskName}`;
  const detail = input.description?.trim();
  return detail ? `${base} — ${detail}` : base;
}
