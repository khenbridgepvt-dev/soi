import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { loadFirmCustomTaskForAdmin } from '@/lib/tasks/firm-custom-task-guards';
import {
  deriveCustomTaskAbbreviation,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import type { Database } from '@/types/database';

export type UpdateFirmCustomTaskInput = {
  name?: string;
  description?: string | null;
};

export type UpdateFirmCustomTaskResult = {
  id: string;
  name: string;
  abbreviation: string;
  description: string | null;
  status: Database['public']['Enums']['task_status'];
  case_id: string;
};

type UpdateOutcome =
  | { ok: true; data: UpdateFirmCustomTaskResult }
  | { ok: false; response: Response };

export function parseUpdateFirmCustomTaskBody(
  body: unknown,
):
  | { ok: true; value: UpdateFirmCustomTaskInput }
  | { ok: false; response: Response } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.'),
    };
  }

  const record = body as Record<string, unknown>;
  const hasName = Object.prototype.hasOwnProperty.call(record, 'name');
  const hasDescription = Object.prototype.hasOwnProperty.call(record, 'description');

  if (!hasName && !hasDescription) {
    return {
      ok: false,
      response: apiError(
        400,
        'VALIDATION_ERROR',
        'At least one of name or description is required.',
        [{ field: 'name', message: 'Provide name and/or description.' }],
      ),
    };
  }

  const value: UpdateFirmCustomTaskInput = {};

  if (hasName) {
    if (typeof record.name !== 'string') {
      return {
        ok: false,
        response: apiError(400, 'VALIDATION_ERROR', 'name must be a string.', [
          { field: 'name', message: 'name must be a string.' },
        ]),
      };
    }
    value.name = record.name;
  }

  if (hasDescription) {
    if (record.description !== null && typeof record.description !== 'string') {
      return {
        ok: false,
        response: apiError(400, 'VALIDATION_ERROR', 'description must be a string or null.', [
          { field: 'description', message: 'description must be a string or null.' },
        ]),
      };
    }
    value.description = record.description as string | null;
  }

  return { ok: true, value };
}

export async function updateFirmCustomTask(
  client: SupabaseClient<Database>,
  taskId: string,
  input: UpdateFirmCustomTaskInput,
): Promise<UpdateOutcome> {
  const loaded = await loadFirmCustomTaskForAdmin(client, taskId);
  if (!loaded.ok) {
    return loaded;
  }

  const updatePayload: Database['public']['Tables']['tasks']['Update'] = {};

  if (input.name !== undefined) {
    const nameResult = validateCustomTaskName(input.name);
    if (!nameResult.ok) {
      return {
        ok: false,
        response: apiError(400, 'VALIDATION_ERROR', nameResult.message, [
          { field: 'name', message: nameResult.message },
        ]),
      };
    }

    updatePayload.name = nameResult.value;
    updatePayload.abbreviation = deriveCustomTaskAbbreviation(nameResult.value);
  }

  if (input.description !== undefined) {
    const descriptionResult = validateCustomTaskDescription(
      input.description === null ? undefined : input.description,
    );
    if (!descriptionResult.ok) {
      return {
        ok: false,
        response: apiError(400, 'VALIDATION_ERROR', descriptionResult.message, [
          { field: 'description', message: descriptionResult.message },
        ]),
      };
    }

    updatePayload.description = descriptionResult.value;
  }

  if (Object.keys(updatePayload).length === 0) {
    return {
      ok: false,
      response: apiError(
        400,
        'VALIDATION_ERROR',
        'At least one of name or description is required.',
      ),
    };
  }

  const { data, error } = await client
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .select('id, name, abbreviation, description, status, case_id')
    .maybeSingle();

  if (error) {
    if (error.code === '42501' || error.message.includes('Permission denied')) {
      return {
        ok: false,
        response: apiError(403, 'FORBIDDEN', 'You do not have permission to update this task.'),
      };
    }

    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to update task.'),
    };
  }

  if (!data) {
    return { ok: false, response: apiError(404, 'NOT_FOUND', 'Task not found.') };
  }

  return { ok: true, data };
}
