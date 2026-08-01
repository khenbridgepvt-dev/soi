import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { mapReferenceEditError } from '@/lib/cases/reference-edit-errors';
import { validateReferenceEditInput } from '@/lib/cases/update-case';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type EditReferenceResult = {
  reference: string;
  adjusted: boolean;
  requested_reference?: string;
};

/** PATCH /api/cases/:id/reference — admin reference edit with counter sync (ADR-0009). */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const body = (await request.json()) as { reference?: string };
  const parsed = validateReferenceEditInput(body.reference);

  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message, [
      { field: 'reference', message: parsed.message },
    ]);
  }

  const { data, error } = await auth.supabase.rpc('edit_case_reference', {
    p_case_id: id,
    p_new_reference: parsed.value,
  });

  if (error || !data) {
    const mapped = mapReferenceEditError(error);
    return apiError(mapped.status, mapped.code, mapped.message);
  }

  const result = data as unknown as EditReferenceResult;

  return Response.json({
    data: {
      reference: result.reference,
      adjusted: result.adjusted,
      requested_reference: result.requested_reference ?? parsed.value,
    },
  });
}
