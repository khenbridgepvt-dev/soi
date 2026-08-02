export const BLOCK_REASON_MAX = 500;

export type BlockReasonResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function validateBlockReason(value: unknown): BlockReasonResult {
  if (typeof value !== 'string') {
    return { ok: false, message: 'Reason is required when blocking a task.' };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, message: 'Reason is required when blocking a task.' };
  }

  if (trimmed.length > BLOCK_REASON_MAX) {
    return {
      ok: false,
      message: `Reason must be ${BLOCK_REASON_MAX} characters or fewer.`,
    };
  }

  return { ok: true, value: trimmed };
}
