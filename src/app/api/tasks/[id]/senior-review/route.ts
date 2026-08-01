import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  fanoutRevisionRequiredStaffNotification,
  fanoutSeniorRevisionAdminAlert,
} from '@/lib/notifications';
import { mapSeniorReviewRpcError } from '@/lib/senior-review/errors';
import {
  buildSeniorRevisionAdminAlertMessage,
  validateRevisionNotes,
  validateSeniorReviewOutcome,
} from '@/lib/senior-review/revision';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SeniorReviewRpcResult = {
  id: string;
  case_id: string;
  outcome: string;
  senior_approval: string;
  status: string;
  senior_revision_count: number;
  task5_id?: string;
  task5_assigned_to?: string | null;
  case_reference?: string | null;
  alert_admins?: boolean;
};

/** EP-17 · POST /api/tasks/:id/senior-review */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  const body = (await request.json()) as {
    outcome?: string;
    revision_notes?: string | null;
  };

  const outcomeResult = validateSeniorReviewOutcome(body.outcome);
  if (!outcomeResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', outcomeResult.message, [
      { field: 'outcome', message: outcomeResult.message },
    ]);
  }

  const notesResult = validateRevisionNotes(body.revision_notes, outcomeResult.value);
  if (!notesResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', notesResult.message, [
      { field: 'revision_notes', message: notesResult.message },
    ]);
  }

  const { data, error } = await auth.supabase.rpc('submit_senior_review', {
    p_task_id: id,
    p_outcome: outcomeResult.value,
    p_revision_notes: notesResult.value,
  });

  if (error) {
    return mapSeniorReviewRpcError(error.message);
  }

  const result = data as SeniorReviewRpcResult;

  let notificationsSent = 0;

  if (result.outcome === 'revisions_required') {
    const caseReference = result.case_reference ?? 'this case';

    if (result.task5_assigned_to && result.task5_id) {
      notificationsSent += await fanoutRevisionRequiredStaffNotification({
        userId: result.task5_assigned_to,
        caseId: result.case_id,
        taskId: result.task5_id,
        caseReference,
      });
    }

    if (result.alert_admins) {
      const message = buildSeniorRevisionAdminAlertMessage(
        caseReference,
        result.senior_revision_count,
      );
      notificationsSent += await fanoutSeniorRevisionAdminAlert({
        caseId: result.case_id,
        message,
      });
    }
  }

  return Response.json({
    data: {
      id: result.id,
      outcome: result.outcome,
      senior_approval: result.senior_approval,
      status: result.status,
      senior_revision_count: result.senior_revision_count,
      notifications_sent: notificationsSent,
    },
  });
}
