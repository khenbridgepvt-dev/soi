import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { fanoutRescheduleResponseNotification } from '@/lib/notifications';
import type { Database } from '@/types/database';
import { assignTask, type AssignTaskResult } from '@/lib/tasks/assign-task';
import { mapAssignError } from '@/lib/tasks/assign-errors';
import { shortTime } from '@/lib/utils/dates';
import { isUuid } from '@/lib/utils/lead-form';

export type ResolvedRescheduleRequest = {
  id: string;
  task_id: string;
  assignment_id: string;
  status: Database['public']['Enums']['reschedule_request_status'];
  proposed_date: string;
  proposed_start_time: string;
  proposed_duration_minutes: number;
  proposed_end_time: string;
  rejection_reason: string | null;
  resolved_at: string;
  resolved_by: string;
  assignment?: AssignTaskResult;
  notification_sent: boolean;
};

type ResolveOutcome =
  | { ok: true; data: ResolvedRescheduleRequest }
  | { ok: false; response: Response };

type LoadedRequest = {
  id: string;
  task_id: string;
  assignment_id: string;
  requested_by: string;
  proposed_date: string;
  proposed_start_time: string;
  proposed_duration_minutes: number;
  status: Database['public']['Enums']['reschedule_request_status'];
  assignment: {
    staff_id: string;
    is_released: boolean;
  };
  task: {
    name: string;
    case_id: string;
  };
  caseReference: string;
};

function notFoundResponse(): Response {
  return apiError(404, 'NOT_FOUND', 'Reschedule request not found.');
}

function alreadyResolvedResponse(status: string): Response {
  return apiError(
    409,
    'CONFLICT',
    `Reschedule request has already been ${status}.`,
  );
}

function calculateEndTimeFromRequest(
  startTime: string,
  durationMinutes: number,
): string | null {
  const [hours, minutes] = startTime.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const total = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(total / 60);
  const endMinutes = total % 60;

  if (endHours >= 24) {
    return null;
  }

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

async function loadPendingRequest(
  client: SupabaseClient<Database>,
  requestId: string,
): Promise<
  | { ok: true; request: LoadedRequest }
  | { ok: false; response: Response }
> {
  if (!isUuid(requestId)) {
    return { ok: false, response: notFoundResponse() };
  }

  const { data: row, error } = await client
    .from('reschedule_requests')
    .select(
      `
      id,
      task_id,
      assignment_id,
      requested_by,
      proposed_date,
      proposed_start_time,
      proposed_duration_minutes,
      status,
      task_assignments!inner (
        staff_id,
        is_released
      ),
      tasks!inner (
        name,
        case_id,
        cases!inner (
          reference
        )
      )
    `,
    )
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    return { ok: false, response: mapAssignError(error, 'Failed to load reschedule request.') };
  }

  if (!row) {
    return { ok: false, response: notFoundResponse() };
  }

  if (row.status !== 'pending') {
    return { ok: false, response: alreadyResolvedResponse(row.status) };
  }

  const assignment = Array.isArray(row.task_assignments)
    ? row.task_assignments[0]
    : row.task_assignments;
  const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
  const caseRow = task?.cases
    ? Array.isArray(task.cases)
      ? task.cases[0]
      : task.cases
    : null;

  if (!assignment || !task) {
    return { ok: false, response: notFoundResponse() };
  }

  return {
    ok: true,
    request: {
      id: row.id,
      task_id: row.task_id,
      assignment_id: row.assignment_id,
      requested_by: row.requested_by,
      proposed_date: row.proposed_date,
      proposed_start_time: shortTime(row.proposed_start_time) ?? row.proposed_start_time,
      proposed_duration_minutes: row.proposed_duration_minutes,
      status: row.status,
      assignment: {
        staff_id: assignment.staff_id,
        is_released: assignment.is_released,
      },
      task: {
        name: task.name,
        case_id: task.case_id,
      },
      caseReference: caseRow?.reference ?? 'Case',
    },
  };
}

export async function approveRescheduleRequest(
  client: SupabaseClient<Database>,
  requestId: string,
  adminId: string,
): Promise<ResolveOutcome> {
  const loaded = await loadPendingRequest(client, requestId);
  if (!loaded.ok) {
    return loaded;
  }

  const request = loaded.request;
  const proposedStartTime = request.proposed_start_time;
  const proposedEndTime = calculateEndTimeFromRequest(
    proposedStartTime,
    request.proposed_duration_minutes,
  );

  if (!proposedEndTime) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'Proposed slot is invalid.'),
    };
  }

  const assignResult = await assignTask(
    client,
    request.task_id,
    {
      staff_id: request.assignment.staff_id,
      date: request.proposed_date,
      start_time: proposedStartTime,
      duration_minutes: request.proposed_duration_minutes,
    },
    { mode: 'reassign', skipNotification: true },
  );

  if (!assignResult.ok) {
    return assignResult;
  }

  const resolvedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await client
    .from('reschedule_requests')
    .update({
      status: 'approved',
      resolved_at: resolvedAt,
      resolved_by: adminId,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id, status, rejection_reason')
    .maybeSingle();

  if (updateError) {
    return { ok: false, response: mapAssignError(updateError, 'Failed to approve reschedule request.') };
  }

  if (!updated) {
    return { ok: false, response: alreadyResolvedResponse('resolved') };
  }

  let notificationSent = false;

  try {
    notificationSent =
      (await fanoutRescheduleResponseNotification({
        userId: request.requested_by,
        taskId: request.task_id,
        caseId: request.task.case_id,
        taskName: request.task.name,
        caseReference: request.caseReference,
        outcome: 'approved',
        proposedDate: request.proposed_date,
        proposedStartTime,
        proposedEndTime,
      })) > 0;
  } catch {
    notificationSent = false;
  }

  return {
    ok: true,
    data: {
      id: request.id,
      task_id: request.task_id,
      assignment_id: assignResult.data.assignment_id,
      status: 'approved',
      proposed_date: request.proposed_date,
      proposed_start_time: proposedStartTime,
      proposed_duration_minutes: request.proposed_duration_minutes,
      proposed_end_time: proposedEndTime,
      rejection_reason: null,
      resolved_at: resolvedAt,
      resolved_by: adminId,
      assignment: assignResult.data,
      notification_sent: notificationSent,
    },
  };
}

export async function rejectRescheduleRequest(
  client: SupabaseClient<Database>,
  requestId: string,
  adminId: string,
  rejectionReason: string | null,
): Promise<ResolveOutcome> {
  const loaded = await loadPendingRequest(client, requestId);
  if (!loaded.ok) {
    return loaded;
  }

  const request = loaded.request;
  const proposedStartTime = request.proposed_start_time;
  const proposedEndTime =
    calculateEndTimeFromRequest(proposedStartTime, request.proposed_duration_minutes) ??
    proposedStartTime;
  const resolvedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await client
    .from('reschedule_requests')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      resolved_at: resolvedAt,
      resolved_by: adminId,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id, status, rejection_reason')
    .maybeSingle();

  if (updateError) {
    return { ok: false, response: mapAssignError(updateError, 'Failed to reject reschedule request.') };
  }

  if (!updated) {
    return { ok: false, response: alreadyResolvedResponse('resolved') };
  }

  let notificationSent = false;

  try {
    notificationSent =
      (await fanoutRescheduleResponseNotification({
        userId: request.requested_by,
        taskId: request.task_id,
        caseId: request.task.case_id,
        taskName: request.task.name,
        caseReference: request.caseReference,
        outcome: 'rejected',
        proposedDate: request.proposed_date,
        proposedStartTime,
        proposedEndTime,
        rejectionReason,
      })) > 0;
  } catch {
    notificationSent = false;
  }

  return {
    ok: true,
    data: {
      id: request.id,
      task_id: request.task_id,
      assignment_id: request.assignment_id,
      status: 'rejected',
      proposed_date: request.proposed_date,
      proposed_start_time: proposedStartTime,
      proposed_duration_minutes: request.proposed_duration_minutes,
      proposed_end_time: proposedEndTime,
      rejection_reason: rejectionReason,
      resolved_at: resolvedAt,
      resolved_by: adminId,
      notification_sent: notificationSent,
    },
  };
}
