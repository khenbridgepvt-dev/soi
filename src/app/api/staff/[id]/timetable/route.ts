import { requireAdminApiAuth, requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  parseTimetableBody,
  serializeTimetableRow,
  toTimetableUpdate,
} from '@/lib/staff/timetable';
import { validateTimetable } from '@/lib/utils/dates';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-23 · GET /api/staff/:id/timetable */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: 'any' });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  if (auth.role !== 'admin' && auth.userId !== id) {
    return apiError(403, 'FORBIDDEN', 'You do not have permission for this action.');
  }

  const { data, error } = await auth.supabase
    .from('staff_timetables')
    .select('*')
    .eq('staff_id', id)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load staff timetable.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Staff timetable not found.');
  }

  return Response.json({ data: serializeTimetableRow(data) });
}

/** EP-22 · PUT /api/staff/:id/timetable */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  const body = parseTimetableBody((await request.json()) as Record<string, string | null>);
  const validation = validateTimetable(body);

  if (!validation.ok) {
    return apiError(400, 'VALIDATION_ERROR', validation.message, validation.details);
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (existingError || !existing) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  const { data, error } = await auth.supabase
    .from('staff_timetables')
    .update(toTimetableUpdate(validation.value))
    .eq('staff_id', id)
    .select('*')
    .single();

  if (error || !data) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update staff timetable.');
  }

  return Response.json({ data: serializeTimetableRow(data) });
}
