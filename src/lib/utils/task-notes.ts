export const TASK_NOTES_MAX = 500;

export function validateTaskNotes(
  input: string | undefined | null,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return { ok: false, message: 'Notes are required.' };
  }

  if (input.length > TASK_NOTES_MAX) {
    return {
      ok: false,
      message: `Notes must be at most ${TASK_NOTES_MAX} characters.`,
    };
  }

  const trimmed = input.trim();
  return { ok: true, value: trimmed ? trimmed : null };
}
