import { apiError } from '@/lib/api/response';
import type { PostgrestError } from '@supabase/supabase-js';

export type AssignErrorDetails = {
  conflicting_task?: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
  working_hours?: { start: string; end: string };
};

export function isExclusionViolation(error: PostgrestError | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === '23P01' ||
    error.message.toLowerCase().includes('no_overlap') ||
    error.message.toLowerCase().includes('exclusion')
  );
}

export function mapAssignError(
  error: PostgrestError | null,
  fallbackMessage = 'Failed to assign task.',
): Response {
  if (isExclusionViolation(error)) {
    return apiError(
      409,
      'CONFLICT',
      'This time slot is no longer available. Please choose another slot.',
    );
  }

  return apiError(500, 'INTERNAL_ERROR', fallbackMessage);
}

export function assignValidationError(
  message: string,
  details?: Array<{ field?: string; message: string }>,
): Response {
  return apiError(400, 'VALIDATION_ERROR', message, details);
}

export function assignConflictError(
  message: string,
  conflictingTask: AssignErrorDetails['conflicting_task'],
): Response {
  return Response.json(
    {
      error: {
        code: 'CONFLICT',
        message,
        conflicting_task: conflictingTask,
      },
    },
    { status: 409 },
  );
}

export function assignUnavailableError(staffName: string, date: string): Response {
  return apiError(
    422,
    'UNPROCESSABLE',
    `Cannot assign: ${staffName} is not available on ${date}.`,
  );
}
