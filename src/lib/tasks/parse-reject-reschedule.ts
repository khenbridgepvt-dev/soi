export const RESCHEDULE_REJECTION_REASON_MAX = 500;

export function parseRejectRescheduleInput(
  input: unknown,
): { ok: true; rejection_reason: string | null } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return { ok: true, rejection_reason: null };
  }

  if (typeof input !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const body = input as Record<string, unknown>;

  if (body.rejection_reason === undefined || body.rejection_reason === null) {
    return { ok: true, rejection_reason: null };
  }

  if (typeof body.rejection_reason !== 'string') {
    return { ok: false, message: 'rejection_reason must be a string or null.' };
  }

  const trimmed = body.rejection_reason.trim();
  if (trimmed.length > RESCHEDULE_REJECTION_REASON_MAX) {
    return {
      ok: false,
      message: `rejection_reason must be at most ${RESCHEDULE_REJECTION_REASON_MAX} characters.`,
    };
  }

  return { ok: true, rejection_reason: trimmed.length > 0 ? trimmed : null };
}
