import type { SupabaseClient } from '@supabase/supabase-js';
import {
  apiError,
  type ApiErrorBody,
} from '@/lib/api/response';
import {
  isCustomTaskLimitExceeded,
  MAX_CUSTOM_TASKS_MESSAGE,
  validateCustomTaskAbbreviation,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import type { Database } from '@/types/database';

export type CreateCustomTaskInput = {
  name?: string;
  abbreviation?: string;
  description?: string;
};

export type CreateCustomTaskResult = {
  id: string;
  case_id: string;
  sequence: number;
  name: string;
  abbreviation: string;
  is_custom: boolean;
  status: Database['public']['Enums']['task_status'];
};

type CreateOutcome =
  | { ok: true; data: CreateCustomTaskResult }
  | { ok: false; response: Response };

export async function createCustomTask(
  client: SupabaseClient<Database>,
  caseId: string,
  input: CreateCustomTaskInput,
): Promise<CreateOutcome> {
  const nameResult = validateCustomTaskName(input.name);
  if (!nameResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', nameResult.message, [
        { field: 'name', message: nameResult.message },
      ]),
    };
  }

  const abbreviationResult = validateCustomTaskAbbreviation(input.abbreviation);
  if (!abbreviationResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', abbreviationResult.message, [
        { field: 'abbreviation', message: abbreviationResult.message },
      ]),
    };
  }

  const descriptionResult = validateCustomTaskDescription(input.description);
  if (!descriptionResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', descriptionResult.message, [
        { field: 'description', message: descriptionResult.message },
      ]),
    };
  }

  const { data: caseRow, error: caseError } = await client
    .from('cases')
    .select('id, status')
    .eq('id', caseId)
    .maybeSingle();

  if (caseError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load case.'),
    };
  }

  if (!caseRow) {
    return {
      ok: false,
      response: apiError(404, 'NOT_FOUND', 'Case not found.'),
    };
  }

  if (caseRow.status !== 'active') {
    return {
      ok: false,
      response: apiError(
        400,
        'INVALID_STATE_TRANSITION',
        'Custom tasks can only be added to active cases.',
      ),
    };
  }

  const { count: customCount, error: countError } = await client
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', caseId)
    .eq('is_custom', true)
    .eq('is_deleted', false);

  if (countError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to count custom tasks.'),
    };
  }

  if (isCustomTaskLimitExceeded(customCount ?? 0)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', MAX_CUSTOM_TASKS_MESSAGE, [
        { field: 'custom_tasks', message: MAX_CUSTOM_TASKS_MESSAGE },
      ]),
    };
  }

  const { data: maxRow, error: maxError } = await client
    .from('tasks')
    .select('sequence')
    .eq('case_id', caseId)
    .eq('is_deleted', false)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to resolve task sequence.'),
    };
  }

  const nextSequence = (maxRow?.sequence ?? 0) + 1;

  const { data, error } = await client
    .from('tasks')
    .insert({
      case_id: caseId,
      sequence: nextSequence,
      name: nameResult.value,
      abbreviation: abbreviationResult.value,
      description: descriptionResult.value,
      is_custom: true,
      status: 'not_started',
    })
    .select('id, case_id, sequence, name, abbreviation, is_custom, status')
    .single();

  if (error) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to add custom task.'),
    };
  }

  return { ok: true, data };
}

export async function readApiError(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}
