import type { SupabaseClient } from '@supabase/supabase-js';
import { fanoutRescheduleRequestAdminNotification } from '@/lib/notifications';
import type { Database } from '@/types/database';
import {
  assignConflictError,
  assignUnavailableError,
  assignValidationError,
  mapAssignError,
} from '@/lib/tasks/assign-errors';
import type { RescheduleRequestInput } from '@/lib/tasks/parse-reschedule-request';
import {
  calculateEndTime,
  findAssignmentConflict,
  formatConflictMessage,
  isSlotWithinWorkingHours,
  MAX_ASSIGNMENT_MINUTES,
  MIN_ASSIGNMENT_MINUTES,
  type AssignmentConflictCandidate,
} from '@/lib/utils/availability';
import {
  dayKeyForDate,
  isTimeAlignedTo30Minutes,
  isValidISODate,
  shortTime,
} from '@/lib/utils/dates';
import { isUuid } from '@/lib/utils/lead-form';

export type RescheduleRequestResult = {
  id: string;
  task_id: string;
  assignment_id: string;
  status: Database['public']['Enums']['reschedule_request_status'];
  proposed_date: string;
  proposed_start_time: string;
  proposed_duration_minutes: number;
  proposed_end_time: string;
  reason: string | null;
  notifications_sent: number;
};

type CreateOutcome =
  | { ok: true; data: RescheduleRequestResult }
  | { ok: false; response: Response };

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function timetableHours(
  row: Database['public']['Tables']['staff_timetables']['Row'] | null | undefined,
  date: string,
): { start: string; end: string } | null {
  if (!row) {
    return null;
  }

  const day = dayKeyForDate(date);
  const start = shortTime(row[`${day}_start`]);
  const end = shortTime(row[`${day}_end`]);

  if (!start || !end) {
    return null;
  }

  return { start, end };
}

export async function createRescheduleRequest(
  client: SupabaseClient<Database>,
  taskId: string,
  userId: string,
  input: RescheduleRequestInput,
): Promise<CreateOutcome> {
  if (!isUuid(input.assignment_id)) {
    return {
      ok: false,
      response: assignValidationError('assignment_id must be a valid UUID.', [
        { field: 'assignment_id', message: 'assignment_id must be a valid UUID.' },
      ]),
    };
  }

  if (!isValidISODate(input.date)) {
    return {
      ok: false,
      response: assignValidationError('date must be a valid YYYY-MM-DD date.', [
        { field: 'date', message: 'date must be a valid YYYY-MM-DD date.' },
      ]),
    };
  }

  if (input.date < utcToday()) {
    return {
      ok: false,
      response: assignValidationError('Cannot request a slot in the past.', [
        { field: 'date', message: 'Cannot request a slot in the past.' },
      ]),
    };
  }

  if (!isTimeAlignedTo30Minutes(input.start_time)) {
    return {
      ok: false,
      response: assignValidationError('start_time must align to 30-minute slots.', [
        { field: 'start_time', message: 'start_time must align to 30-minute slots.' },
      ]),
    };
  }

  if (
    input.duration_minutes < MIN_ASSIGNMENT_MINUTES ||
    input.duration_minutes > MAX_ASSIGNMENT_MINUTES
  ) {
    return {
      ok: false,
      response: assignValidationError(
        `duration_minutes must be between ${MIN_ASSIGNMENT_MINUTES} and ${MAX_ASSIGNMENT_MINUTES}.`,
        [
          {
            field: 'duration_minutes',
            message: `duration_minutes must be between ${MIN_ASSIGNMENT_MINUTES} and ${MAX_ASSIGNMENT_MINUTES}.`,
          },
        ],
      ),
    };
  }

  const endResult = calculateEndTime(input.start_time, input.duration_minutes);
  if (!endResult.ok) {
    return {
      ok: false,
      response: assignValidationError(endResult.message, [
        { field: 'duration_minutes', message: endResult.message },
      ]),
    };
  }

  const { data: assignment, error: assignmentError } = await client
    .from('task_assignments')
    .select('id, task_id, staff_id, date, start_time, end_time, is_released')
    .eq('id', input.assignment_id)
    .maybeSingle();

  if (assignmentError) {
    return { ok: false, response: mapAssignError(assignmentError) };
  }

  if (!assignment || assignment.is_released || assignment.task_id !== taskId) {
    return {
      ok: false,
      response: assignValidationError('Assignment not found for this task.'),
    };
  }

  if (assignment.staff_id !== userId) {
    return {
      ok: false,
      response: assignValidationError('You can only reschedule your own assignments.'),
    };
  }

  const { data: task, error: taskError } = await client
    .from('tasks')
    .select('id, name, status, is_deleted, case_id')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError) {
    return { ok: false, response: mapAssignError(taskError) };
  }

  if (!task || task.is_deleted) {
    return { ok: false, response: assignValidationError('Task not found.') };
  }

  if (task.status === 'completed') {
    return {
      ok: false,
      response: assignValidationError('This task cannot be rescheduled.'),
    };
  }

  const { data: caseRow, error: caseError } = await client
    .from('cases')
    .select('id, status, reference')
    .eq('id', task.case_id)
    .maybeSingle();

  if (caseError) {
    return { ok: false, response: mapAssignError(caseError) };
  }

  if (!caseRow || caseRow.status !== 'active') {
    return {
      ok: false,
      response: assignValidationError('Task belongs to a case that is not active.'),
    };
  }

  const { data: pendingRequest, error: pendingError } = await client
    .from('reschedule_requests')
    .select('id')
    .eq('assignment_id', input.assignment_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingError) {
    return { ok: false, response: mapAssignError(pendingError) };
  }

  if (pendingRequest) {
    return {
      ok: false,
      response: assignValidationError(
        'A pending reschedule request already exists for this assignment.',
      ),
    };
  }

  const { data: staff, error: staffError } = await client
    .from('profiles')
    .select('id, full_name, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (staffError) {
    return { ok: false, response: mapAssignError(staffError) };
  }

  if (!staff || !staff.is_active) {
    return {
      ok: false,
      response: assignValidationError('Staff profile not found or inactive.'),
    };
  }

  const { data: timetable, error: timetableError } = await client
    .from('staff_timetables')
    .select('*')
    .eq('staff_id', userId)
    .maybeSingle();

  if (timetableError) {
    return { ok: false, response: mapAssignError(timetableError) };
  }

  const workingHours = timetableHours(timetable, input.date);
  if (!workingHours) {
    return {
      ok: false,
      response: assignUnavailableError(staff.full_name, input.date),
    };
  }

  const proposed = { start: input.start_time, end: endResult.end };

  const { data: existingRows, error: existingError } = await client
    .from('task_assignments')
    .select(
      `
      id,
      task_id,
      start_time,
      end_time,
      tasks (
        id,
        name
      )
    `,
    )
    .eq('staff_id', userId)
    .eq('date', input.date)
    .eq('is_released', false);

  if (existingError) {
    return { ok: false, response: mapAssignError(existingError) };
  }

  const candidates: AssignmentConflictCandidate[] = (existingRows ?? []).map((row) => {
    const taskRelation = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
    return {
      assignment_id: row.id,
      task_id: row.task_id,
      task_name: taskRelation?.name ?? 'Task',
      start: shortTime(row.start_time) ?? row.start_time,
      end: shortTime(row.end_time) ?? row.end_time,
    };
  });

  const conflict = findAssignmentConflict(proposed, candidates, taskId);
  if (conflict) {
    return {
      ok: false,
      response: assignConflictError(formatConflictMessage(staff.full_name, conflict), {
        id: conflict.task_id,
        name: conflict.task_name,
        start_time: conflict.start_time,
        end_time: conflict.end_time,
      }),
    };
  }

  const isOvertime = !isSlotWithinWorkingHours(proposed.start, proposed.end, workingHours);

  const { data: requestRow, error: insertError } = await client
    .from('reschedule_requests')
    .insert({
      task_id: taskId,
      assignment_id: input.assignment_id,
      requested_by: userId,
      proposed_date: input.date,
      proposed_start_time: input.start_time,
      proposed_duration_minutes: input.duration_minutes,
      reason: input.note ?? null,
      status: 'pending',
    })
    .select('id, status, proposed_date, proposed_start_time, proposed_duration_minutes, reason')
    .single();

  if (insertError || !requestRow) {
    if (insertError?.code === '23505') {
      return {
        ok: false,
        response: assignValidationError(
          'A pending reschedule request already exists for this assignment.',
        ),
      };
    }

    return { ok: false, response: mapAssignError(insertError) };
  }

  const caseReference = caseRow.reference ?? 'Case';

  let notificationsSent = 0;

  try {
    notificationsSent = await fanoutRescheduleRequestAdminNotification({
      rescheduleRequestId: requestRow.id,
      taskId,
      caseId: caseRow.id,
      taskName: task.name,
      caseReference,
      staffName: staff.full_name,
      proposedDate: input.date,
      proposedStartTime: input.start_time,
      proposedEndTime: endResult.end,
      proposedDurationMinutes: input.duration_minutes,
      reason: input.note ?? null,
      isOvertime,
    });
  } catch {
    notificationsSent = 0;
  }

  return {
    ok: true,
    data: {
      id: requestRow.id,
      task_id: taskId,
      assignment_id: input.assignment_id,
      status: requestRow.status,
      proposed_date: requestRow.proposed_date,
      proposed_start_time: shortTime(requestRow.proposed_start_time) ?? input.start_time,
      proposed_duration_minutes: requestRow.proposed_duration_minutes,
      proposed_end_time: endResult.end,
      reason: requestRow.reason,
      notifications_sent: notificationsSent,
    },
  };
}
