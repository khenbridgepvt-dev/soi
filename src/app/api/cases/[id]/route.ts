import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { rejectIfInternalCase } from '@/lib/cases/guard-internal-case';
import { fetchCaseDetail } from '@/lib/cases/fetch-case-detail';
import {
  parseCasePatchBody,
  staffPatchForbiddenFields,
} from '@/lib/cases/update-case';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-03 · GET /api/cases/:id — full case detail with tasks and dependants. */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const internalGuard = await rejectIfInternalCase(auth.supabase, id);
  if (internalGuard) {
    return internalGuard;
  }

  const detail = await fetchCaseDetail(auth.supabase, id, auth.role);

  if (!detail) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  return Response.json({ data: detail });
}

/** EP-04 · PATCH /api/cases/:id — update editable case fields (not reference). */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const internalGuard = await rejectIfInternalCase(auth.supabase, id);
  if (internalGuard) {
    return internalGuard;
  }

  const body = (await request.json()) as Record<string, unknown>;
  const parsed = parseCasePatchBody(body);

  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message, [
      { field: parsed.field, message: parsed.message },
    ]);
  }

  const forbidden = staffPatchForbiddenFields(parsed.fields);
  if (auth.role !== 'admin' && forbidden.length > 0) {
    return apiError(
      403,
      'FORBIDDEN',
      'You do not have permission to update those case fields.',
    );
  }

  const { supabase } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from('cases')
    .select('id, status, last_date, appointment_date, application_type_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case.');
  }

  if (!existing) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  if (existing.status === 'rejected' || existing.status === 'completed') {
    return apiError(400, 'INVALID_STATE_TRANSITION', 'This case is read-only.');
  }

  const updates = { ...parsed.updates };

  if (updates.last_date === null && existing.last_date) {
    return apiError(
      400,
      'INVALID_STATE_TRANSITION',
      'Last date cannot be cleared once set.',
      [{ field: 'last_date', message: 'Last date cannot be cleared once set.' }],
    );
  }

  if (updates.appointment_date === null && existing.appointment_date) {
    return apiError(
      400,
      'INVALID_STATE_TRANSITION',
      'Appointment date cannot be cleared once set.',
      [{ field: 'appointment_date', message: 'Appointment date cannot be cleared once set.' }],
    );
  }

  if (updates.application_type_id) {
    const { data: typeRow } = await supabase
      .from('application_types')
      .select('id, is_active')
      .eq('id', updates.application_type_id)
      .maybeSingle();

    const isCurrentType = updates.application_type_id === existing.application_type_id;
    if (!typeRow || (!typeRow.is_active && !isCurrentType)) {
      return apiError(400, 'VALIDATION_ERROR', 'Application type must be active.', [
        { field: 'application_type_id', message: 'Application type must be active.' },
      ]);
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('cases')
    .update(updates)
    .eq('id', id)
    .select('id, updated_at')
    .single();

  if (updateError) {
    if (updateError.message.includes('IMMUTABLE_FIELD')) {
      return apiError(400, 'INVALID_STATE_TRANSITION', updateError.message);
    }
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update case.');
  }

  return Response.json({ data: updated });
}

/** EP-08 · DELETE /api/cases/:id — soft-delete case and cascade children. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: 'admin' });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const internalGuard = await rejectIfInternalCase(auth.supabase, id);
  if (internalGuard) {
    return internalGuard;
  }

  try {
    const { softDeleteCase } = await import('@/lib/archive/soft-delete-case');
    const data = await softDeleteCase(auth.supabase, id);
    return Response.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not found') || message.includes('P0002')) {
      return apiError(404, 'NOT_FOUND', 'Case not found.');
    }
    if (message.includes('Permission denied')) {
      return apiError(403, 'FORBIDDEN', 'You do not have permission to delete this case.');
    }
    return apiError(500, 'INTERNAL_ERROR', 'Failed to delete case.');
  }
}
