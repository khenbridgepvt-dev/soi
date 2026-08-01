/**
 * Maps what `public.accept_lead()` raises onto the EP-05 error table.
 * The RPC always rolls back before raising, so every branch here means
 * "nothing was written".
 */

export type AcceptErrorMapping = {
  status: number;
  code: string;
  message: string;
};

export function mapAcceptLeadError(
  error: { code?: string | null; message?: string | null } | null,
): AcceptErrorMapping {
  const code = error?.code ?? '';
  const message = error?.message ?? '';

  if (code === 'P0002' || message.includes('CASE_NOT_FOUND')) {
    return { status: 404, code: 'NOT_FOUND', message: 'Case not found.' };
  }

  if (message.includes('INVALID_STATE_TRANSITION')) {
    return {
      status: 400,
      code: 'INVALID_STATE_TRANSITION',
      message: 'Case is not in lead_pending status.',
    };
  }

  if (code === '42501' || message.includes('FORBIDDEN')) {
    return {
      status: 403,
      code: 'FORBIDDEN',
      message: 'You do not have permission for this action.',
    };
  }

  // A generated reference colliding with an admin-edited one (ticket 0014)
  // aborts the transaction.
  if (code === '23505') {
    return {
      status: 500,
      code: 'REFERENCE_GENERATION_FAILED',
      message: 'Could not generate a unique case reference. No changes were made.',
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Failed to accept the lead. No changes were made.',
  };
}
