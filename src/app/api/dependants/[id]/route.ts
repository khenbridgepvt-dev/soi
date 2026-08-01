import { requireAdminApiAuth, type ApiAuthContext } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  validateDependantName,
  validateDependantRelationship,
} from '@/lib/utils/dependant';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function assertDependantCaseWritable(
  auth: ApiAuthContext,
  dependantId: string,
): Promise<Response | null> {
  const { data: dependant, error } = await auth.supabase
    .from('dependants')
    .select('id, case_id')
    .eq('id', dependantId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load dependant.');
  }

  if (!dependant) {
    return apiError(404, 'NOT_FOUND', 'Dependant not found.');
  }

  const { data: caseRow, error: caseError } = await auth.supabase
    .from('cases')
    .select('status')
    .eq('id', dependant.case_id)
    .maybeSingle();

  if (caseError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case.');
  }

  if (!caseRow || caseRow.status === 'rejected' || caseRow.status === 'completed') {
    return apiError(400, 'INVALID_STATE_TRANSITION', 'This case is read-only.');
  }

  return null;
}

/** EP-10 · PATCH /api/dependants/:id */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Dependant not found.');
  }

  const body = (await request.json()) as { name?: string; relationship?: string };
  const updates: { name?: string; relationship?: string } = {};

  if ('name' in body) {
    const nameResult = validateDependantName(body.name);
    if (!nameResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
        { field: 'name', message: nameResult.message },
      ]);
    }
    updates.name = nameResult.value;
  }

  if ('relationship' in body) {
    const relationshipResult = validateDependantRelationship(body.relationship);
    if (!relationshipResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', relationshipResult.message, [
        { field: 'relationship', message: relationshipResult.message },
      ]);
    }
    updates.relationship = relationshipResult.value;
  }

  if (Object.keys(updates).length === 0) {
    return apiError(400, 'VALIDATION_ERROR', 'No valid fields to update.');
  }

  const writableCheck = await assertDependantCaseWritable(auth, id);
  if (writableCheck) {
    return writableCheck;
  }

  const { data, error } = await auth.supabase
    .from('dependants')
    .update(updates)
    .eq('id', id)
    .eq('is_deleted', false)
    .select('id, case_id, name, relationship, created_at')
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update dependant.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Dependant not found.');
  }

  return Response.json({ data });
}

/** EP-11 · DELETE /api/dependants/:id — soft-delete */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Dependant not found.');
  }

  const { userId, supabase } = auth;
  const now = new Date().toISOString();

  const writableCheck = await assertDependantCaseWritable(auth, id);
  if (writableCheck) {
    return writableCheck;
  }

  const { data, error } = await supabase
    .from('dependants')
    .update({
      is_deleted: true,
      deleted_at: now,
      deleted_by: userId,
    })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('id, is_deleted')
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to delete dependant.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Dependant not found.');
  }

  return Response.json({ data });
}
