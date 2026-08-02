import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fanoutNewTaskAssignmentNotification,
  fanoutTaskReassignedNotification,
} from '@/lib/notifications';
import type { Database } from '@/types/database';
import {
  assignConflictError,
  assignUnavailableError,
  assignValidationError,
  isExclusionViolation,
  mapAssignError,
} from '@/lib/tasks/assign-errors';
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

export type AssignTaskInput = {
  staff_id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
};

export type AssignTaskResult = {
  task_id: string;
  assignment_id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_overtime: boolean;
  notification_sent: boolean;
};

type AssignOptions = {
  /** EP-59 releases all current slots before inserting. */
  mode?: 'assign' | 'reassign';
};

type AssignOutcome =
  | { ok: true; data: AssignTaskResult }
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

export async function assignTask(
  client: SupabaseClient<Database>,
  taskId: string,
  input: AssignTaskInput,
  options: AssignOptions = {},
): Promise<AssignOutcome> {
  if (!isUuid(input.staff_id)) {
    return {
      ok: false,
      response: assignValidationError('staff_id must be a valid UUID.', [
        { field: 'staff_id', message: 'staff_id must be a valid UUID.' },
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
      response: assignValidationError('Cannot assign tasks in the past.', [
        { field: 'date', message: 'Cannot assign tasks in the past.' },
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

  const { data: task, error: taskError } = await client
    .from('tasks')
    .select('id, name, abbreviation, status, is_deleted, is_overdue, case_id, assigned_to')
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
      response: assignValidationError('Completed tasks cannot be assigned.'),
    };
  }

  const { data: caseRow, error: caseError } = await client
    .from('cases')
    .select('id, status, reference, client_first_name, client_last_name, is_urgent')
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

  const { data: staff, error: staffError } = await client
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', input.staff_id)
    .maybeSingle();

  if (staffError) {
    return { ok: false, response: mapAssignError(staffError) };
  }

  if (!staff || !staff.is_active || (staff.role !== 'staff' && staff.role !== 'senior')) {
    return {
      ok: false,
      response: assignValidationError('Staff member not found or inactive.', [
        { field: 'staff_id', message: 'Staff member not found or inactive.' },
      ]),
    };
  }

  const { data: timetable, error: timetableError } = await client
    .from('staff_timetables')
    .select('*')
    .eq('staff_id', input.staff_id)
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
    .eq('staff_id', input.staff_id)
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
  const previousAssignee = task.assigned_to;

  const { error: releaseError } = await client
    .from('task_assignments')
    .update({ is_released: true, released_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('is_released', false);

  if (releaseError) {
    return { ok: false, response: mapAssignError(releaseError) };
  }

  const { data: assignment, error: insertError } = await client
    .from('task_assignments')
    .insert({
      task_id: taskId,
      staff_id: input.staff_id,
      date: input.date,
      start_time: input.start_time,
      end_time: endResult.end,
      duration_minutes: input.duration_minutes,
    })
    .select('id')
    .single();

  if (insertError || !assignment) {
    if (isExclusionViolation(insertError)) {
      return {
        ok: false,
        response: assignConflictError(
          formatConflictMessage(staff.full_name, {
            assignment_id: '',
            task_id: '',
            task_name: 'another task',
            start_time: input.start_time,
            end_time: endResult.end,
          }),
          undefined,
        ),
      };
    }

    return { ok: false, response: mapAssignError(insertError) };
  }

  const slotEnd = new Date(`${input.date}T${endResult.end}:00Z`);
  const shouldClearOverdue = task.is_overdue && slotEnd.getTime() > Date.now();

  const { error: taskUpdateError } = await client
    .from('tasks')
    .update({
      assigned_to: input.staff_id,
      ...(shouldClearOverdue ? { is_overdue: false } : {}),
    })
    .eq('id', taskId);

  if (taskUpdateError) {
    return { ok: false, response: mapAssignError(taskUpdateError) };
  }

  const caseReference = caseRow.reference ?? 'Case';

  let notificationSent = false;

  try {
    notificationSent =
      (await fanoutNewTaskAssignmentNotification({
        userId: input.staff_id,
        taskId,
        caseId: caseRow.id,
        taskName: task.name,
        caseReference,
        startTime: input.start_time,
        endTime: endResult.end,
        durationMinutes: input.duration_minutes,
        isUrgent: caseRow.is_urgent || task.status === 'blocked',
      })) > 0;

    if (
      options.mode === 'reassign' &&
      previousAssignee &&
      previousAssignee !== input.staff_id
    ) {
      await fanoutTaskReassignedNotification({
        userId: previousAssignee,
        taskId,
        caseId: caseRow.id,
        taskName: task.name,
        caseReference,
      });
    }
  } catch {
    notificationSent = false;
  }

  return {
    ok: true,
    data: {
      task_id: taskId,
      assignment_id: assignment.id,
      staff_id: input.staff_id,
      staff_name: staff.full_name,
      date: input.date,
      start_time: input.start_time,
      end_time: endResult.end,
      duration_minutes: input.duration_minutes,
      is_overtime: isOvertime,
      notification_sent: notificationSent,
    },
  };
}

export async function releaseAssignment(
  client: SupabaseClient<Database>,
  taskId: string,
  assignmentId: string,
): Promise<
  | { ok: true; data: { released: true; task_id: string; assignment_id: string } }
  | { ok: false; response: Response }
> {
  const { data: assignment, error: fetchError } = await client
    .from('task_assignments')
    .select('id, task_id, is_released')
    .eq('id', assignmentId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, response: mapAssignError(fetchError) };
  }

  if (!assignment || assignment.is_released) {
    return { ok: false, response: assignValidationError('Assignment not found.') };
  }

  const releasedAt = new Date().toISOString();
  const { error: releaseError } = await client
    .from('task_assignments')
    .update({ is_released: true, released_at: releasedAt })
    .eq('id', assignmentId);

  if (releaseError) {
    return { ok: false, response: mapAssignError(releaseError) };
  }

  const { data: remaining } = await client
    .from('task_assignments')
    .select('id')
    .eq('task_id', taskId)
    .eq('is_released', false);

  if ((remaining ?? []).length === 0) {
    await client.from('tasks').update({ assigned_to: null }).eq('id', taskId);
  }

  return {
    ok: true,
    data: { released: true, task_id: taskId, assignment_id: assignmentId },
  };
}
