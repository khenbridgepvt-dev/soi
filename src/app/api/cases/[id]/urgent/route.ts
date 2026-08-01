import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fanoutUrgentCaseNotifications } from '@/lib/notifications';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-07 · POST /api/cases/:id/urgent — toggle case urgency and cascade to tasks. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const body = (await request.json()) as { is_urgent?: boolean };

  if (typeof body.is_urgent !== 'boolean') {
    return apiError(400, 'VALIDATION_ERROR', 'is_urgent must be a boolean.', [
      { field: 'is_urgent', message: 'is_urgent must be a boolean.' },
    ]);
  }

  const { supabase, userId } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from('cases')
    .select('id, status, client_first_name, client_last_name, is_urgent')
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

  const previousUrgent = existing.is_urgent;

  const { error: taskUpdateError } = await supabase
    .from('tasks')
    .update({ is_urgent: body.is_urgent })
    .eq('case_id', id);

  if (taskUpdateError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update task urgency.');
  }

  const { error: caseUpdateError } = await supabase
    .from('cases')
    .update({ is_urgent: body.is_urgent })
    .eq('id', id);

  if (caseUpdateError) {
    await supabase
      .from('tasks')
      .update({ is_urgent: previousUrgent })
      .eq('case_id', id);
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update case urgency.');
  }

  let notificationsSent = 0;

  if (body.is_urgent && !previousUrgent) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('case_id', id);

    const { data: actor } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const clientName = `${existing.client_first_name} ${existing.client_last_name}`;
    const adminName = actor?.full_name ?? 'An administrator';

    try {
      notificationsSent = await fanoutUrgentCaseNotifications({
        caseId: id,
        clientName,
        adminName,
        tasks: tasks ?? [],
      });
    } catch {
      // Urgency already committed; notification delivery is best-effort (matches reject route).
      notificationsSent = 0;
    }
  }

  return Response.json({
    data: {
      id,
      is_urgent: body.is_urgent,
      notifications_sent: notificationsSent,
    },
  });
}
