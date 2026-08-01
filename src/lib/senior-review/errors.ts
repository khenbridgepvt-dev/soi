import { apiError } from '@/lib/api/response';

export function mapSeniorReviewRpcError(message: string): Response {
  if (message.includes('FORBIDDEN')) {
    return apiError(403, 'FORBIDDEN', 'You do not have permission to submit senior review.');
  }

  if (message.includes('NOT_FOUND')) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (message.includes('VALIDATION_ERROR')) {
    const text = message.replace(/^VALIDATION_ERROR:\s*/, '');
    return apiError(400, 'VALIDATION_ERROR', text);
  }

  if (message.includes('INVALID_STATE_TRANSITION')) {
    const text = message.replace(/^INVALID_STATE_TRANSITION:\s*/, '');
    return apiError(400, 'INVALID_STATE_TRANSITION', text);
  }

  return apiError(500, 'INTERNAL_ERROR', 'Failed to submit senior review.');
}
