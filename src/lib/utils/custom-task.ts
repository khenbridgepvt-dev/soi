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
