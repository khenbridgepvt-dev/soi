export type ReferenceEditErrorMapping = {
  status: number;
  code: string;
  message: string;
};

export function mapReferenceEditError(
  error: { code?: string | null; message?: string | null } | null,
): ReferenceEditErrorMapping {
  const code = error?.code ?? '';
  const message = error?.message ?? '';

  if (code === 'P0002' || message.includes('CASE_NOT_FOUND')) {
    return { status: 404, code: 'NOT_FOUND', message: 'Case not found.' };
  }

  if (message.includes('DUPLICATE_REFERENCE') || code === '23505') {
    return {
      status: 409,
      code: 'DUPLICATE_REFERENCE',
      message: 'Another case already uses that reference.',
    };
  }

  if (message.includes('VALIDATION_ERROR') || message.includes('INVALID_STATE')) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: message.includes('format')
        ? 'Reference must match MMYYNO/TYPE/ABC (e.g. 072604/SKW/MAR).'
        : 'Reference cannot be edited for this case.',
    };
  }

  if (code === '42501' || message.includes('FORBIDDEN')) {
    return {
      status: 403,
      code: 'FORBIDDEN',
      message: 'You do not have permission for this action.',
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Failed to update the case reference.',
  };
}
