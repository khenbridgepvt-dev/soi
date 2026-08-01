import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  isCustomTaskLimitExceeded,
  MAX_CUSTOM_TASKS_MESSAGE,
  validateCustomTaskAbbreviation,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-11b · POST /api/cases/:id/tasks/custom */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id: caseId } = await context.params;
  if (!isUuid(caseId)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const body = (await request.json()) as {
    name?: string;
    abbreviation?: string;
    description?: string;
  };

  const nameResult = validateCustomTaskName(body.name);
  if (!nameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
      { field: 'name', message: nameResult.message },
    ]);
  }

  const abbreviationResult = validateCustomTaskAbbreviation(body.abbreviation);
  if (!abbreviationResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', abbreviationResult.message, [
      { field: 'abbreviation', message: abbreviationResult.message },
    ]);
  }

  const descriptionResult = validateCustomTaskDescription(body.description);
  if (!descriptionResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', descriptionResult.message, [
      { field: 'description', message: descriptionResult.message },
    ]);
  }

  const { supabase } = auth;

  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, status')
    .eq('id', caseId)
    .maybeSingle();

  if (caseError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case.');
  }

  if (!caseRow) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  if (caseRow.status !== 'active') {
    return apiError(400, 'INVALID_STATE_TRANSITION', 'Custom tasks can only be added to active cases.');
  }

  const { count: customCount, error: countError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', caseId)
    .eq('is_custom', true)
    .eq('is_deleted', false);

  if (countError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to count custom tasks.');
  }

  if (isCustomTaskLimitExceeded(customCount ?? 0)) {
    return apiError(400, 'VALIDATION_ERROR', MAX_CUSTOM_TASKS_MESSAGE, [
      { field: 'custom_tasks', message: MAX_CUSTOM_TASKS_MESSAGE },
    ]);
  }

  const { data: maxRow, error: maxError } = await supabase
    .from('tasks')
    .select('sequence')
    .eq('case_id', caseId)
    .eq('is_deleted', false)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to resolve task sequence.');
  }

  const nextSequence = (maxRow?.sequence ?? 0) + 1;

  const { data, error } = await supabase
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
    return apiError(500, 'INTERNAL_ERROR', 'Failed to add custom task.');
  }

  return Response.json({ data }, { status: 201 });
}
