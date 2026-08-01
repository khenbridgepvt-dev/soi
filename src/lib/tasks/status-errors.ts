import { apiError } from '@/lib/api/response';

export function mapTaskStatusRpcError(message: string): Response {
  if (message.includes('FORBIDDEN')) {
    return apiError(403, 'FORBIDDEN', 'You do not have permission to update this task.');
  }

  if (message.includes('NOT_FOUND')) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (message.includes('PREREQUISITE_NOT_MET')) {
    const text = message.replace(/^PREREQUISITE_NOT_MET:\s*/, '');
    return apiError(400, 'PREREQUISITE_NOT_MET', text);
  }

  if (message.includes('INVALID_STATE_TRANSITION')) {
    const text = message.replace(/^INVALID_STATE_TRANSITION:\s*/, '');
    return apiError(400, 'INVALID_STATE_TRANSITION', text);
  }

  if (message.includes('VALIDATION_ERROR')) {
    const text = message.replace(/^VALIDATION_ERROR:\s*/, '');
    return apiError(400, 'VALIDATION_ERROR', text);
  }

  return apiError(500, 'INTERNAL_ERROR', 'Failed to update task status.');
}
