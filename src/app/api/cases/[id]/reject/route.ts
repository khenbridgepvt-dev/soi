import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fanoutLeadRejectedNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase/service';
import { validateRejectReason } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  const { supabase, userId } = auth;
  const body = (await request.json()) as { reason?: string };

  const reasonResult = validateRejectReason(body.reason);
  if (!reasonResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', reasonResult.message, [
      { field: 'reason', message: reasonResult.message },
    ]);
  }

  const { data: existing, error: fetchError } = await supabase
    .from('cases')
    .select('id, status, client_first_name, client_last_name, notes')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case.');
  }

  if (!existing) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  if (existing.status !== 'lead_pending') {
    return apiError(
      400,
      'INVALID_STATE_TRANSITION',
      'Only leads pending review can be rejected.',
    );
  }

  const rejectionNote = reasonResult.value
    ? `Rejection reason: ${reasonResult.value}`
    : null;
  const updatedNotes =
    rejectionNote && existing.notes
      ? `${existing.notes}\n${rejectionNote}`
      : rejectionNote ?? existing.notes;

  const { data: updated, error: updateError } = await supabase
    .from('cases')
    .update({ status: 'rejected', notes: updatedNotes })
    .eq('id', id)
    .select('id, status')
    .single();

  if (updateError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to reject lead.');
  }

  const { data: actor } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const adminName = actor?.full_name ?? 'An administrator';
  const clientName = `${existing.client_first_name} ${existing.client_last_name}`;
  const reasonText = reasonResult.value ?? 'No reason provided';

  const { data: otherAdmins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)
    .neq('id', userId);

  if (otherAdmins && otherAdmins.length > 0) {
    try {
      const service = createServiceClient();
      await fanoutLeadRejectedNotifications({
        adminIds: otherAdmins.map((admin) => admin.id),
        caseId: id,
        clientName,
        adminName,
        reasonText,
        service,
      });
    } catch {
      // Reject already committed; notification delivery is best-effort.
    }
  }

  return Response.json({ data: updated });
}
