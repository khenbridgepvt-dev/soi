import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { rejectIfInternalCase } from '@/lib/cases/guard-internal-case';
import {
  validateDependantName,
  validateDependantRelationship,
} from '@/lib/utils/dependant';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-09 · POST /api/cases/:id/dependants */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id: caseId } = await context.params;
  if (!isUuid(caseId)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const internalGuard = await rejectIfInternalCase(auth.supabase, caseId);
  if (internalGuard) {
    return internalGuard;
  }

  const body = (await request.json()) as { name?: string; relationship?: string };

  const nameResult = validateDependantName(body.name);
  if (!nameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
      { field: 'name', message: nameResult.message },
    ]);
  }

  const relationshipResult = validateDependantRelationship(body.relationship);
  if (!relationshipResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', relationshipResult.message, [
      { field: 'relationship', message: relationshipResult.message },
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

  if (caseRow.status === 'rejected' || caseRow.status === 'completed') {
    return apiError(400, 'INVALID_STATE_TRANSITION', 'This case is read-only.');
  }

  const { data, error } = await supabase
    .from('dependants')
    .insert({
      case_id: caseId,
      name: nameResult.value,
      relationship: relationshipResult.value,
    })
    .select('id, case_id, name, relationship, created_at')
    .single();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to add dependant.');
  }

  return Response.json({ data }, { status: 201 });
}
