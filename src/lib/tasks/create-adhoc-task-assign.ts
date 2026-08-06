import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { assignTask } from '@/lib/tasks/assign-task';
import {
  appendTaskAuditNote,
  deriveCustomTaskAbbreviation,
  formatAdhocAuditNoteLine,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import { isUuid } from '@/lib/utils/lead-form';
import type { Database } from '@/types/database';

export type CreateAdhocTaskAssignInput = {
  name?: string;
  description?: string;
  staff_id?: string;
  date?: string;
  start_time?: string;
  duration_minutes?: number;
  linked_task_id?: string;
};

export type CreateAdhocTaskAssignResult = {
  task_id: string;
  assignment_id: string;
  case_id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  linked_task_id: string | null;
  linked_case_id: string | null;
};

type CreateOutcome =
  | { ok: true; data: CreateAdhocTaskAssignResult }
  | { ok: false; response: Response };

export async function createAdhocTaskAssign(
  client: SupabaseClient<Database>,
  input: CreateAdhocTaskAssignInput,
): Promise<CreateOutcome> {
  const nameResult = validateCustomTaskName(input.name);
  if (!nameResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', nameResult.message, [
        { field: 'name', message: nameResult.message },
      ]),
    };
  }

  const descriptionResult = validateCustomTaskDescription(input.description);
  if (!descriptionResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', descriptionResult.message, [
        { field: 'description', message: descriptionResult.message },
      ]),
    };
  }

  if (!input.staff_id || !isUuid(input.staff_id)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'staff_id must be a valid UUID.', [
        { field: 'staff_id', message: 'staff_id must be a valid UUID.' },
      ]),
    };
  }

  if (input.linked_task_id !== undefined && input.linked_task_id !== null && !isUuid(input.linked_task_id)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'linked_task_id must be a valid UUID.', [
        { field: 'linked_task_id', message: 'linked_task_id must be a valid UUID.' },
      ]),
    };
  }

  const { data: internalCase, error: internalCaseError } = await client
    .from('cases')
    .select('id, status, is_internal')
    .eq('id', INTERNAL_CASE_ID)
    .maybeSingle();

  if (internalCaseError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load internal case.'),
    };
  }

  if (!internalCase?.is_internal || internalCase.status !== 'active') {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Internal ad-hoc case is not available.'),
    };
  }

  const { data: maxRow, error: maxError } = await client
    .from('tasks')
    .select('sequence')
    .eq('case_id', INTERNAL_CASE_ID)
    .eq('is_deleted', false)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to resolve task sequence.'),
    };
  }

  const abbreviation = deriveCustomTaskAbbreviation(nameResult.value);
  const nextSequence = (maxRow?.sequence ?? 0) + 1;

  const { data: createdTask, error: createError } = await client
    .from('tasks')
    .insert({
      case_id: INTERNAL_CASE_ID,
      sequence: nextSequence,
      name: nameResult.value,
      abbreviation,
      description: descriptionResult.value,
      is_custom: true,
      status: 'not_started',
    })
    .select('id')
    .single();

  if (createError || !createdTask) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to create ad-hoc task.'),
    };
  }

  const assignResult = await assignTask(client, createdTask.id, {
    staff_id: input.staff_id!,
    date: input.date ?? '',
    start_time: input.start_time ?? '',
    duration_minutes: input.duration_minutes ?? 0,
  });

  if (!assignResult.ok) {
    await client.from('tasks').delete().eq('id', createdTask.id);
    return assignResult;
  }

  let linkedCaseId: string | null = null;

  if (input.linked_task_id) {
    const { data: linkedTask, error: linkedError } = await client
      .from('tasks')
      .select('id, notes, is_deleted, case_id, cases ( id, status, is_internal )')
      .eq('id', input.linked_task_id)
      .maybeSingle();

    if (linkedError) {
      return {
        ok: false,
        response: apiError(500, 'INTERNAL_ERROR', 'Failed to load linked task.'),
      };
    }

    const linkedCase = Array.isArray(linkedTask?.cases)
      ? linkedTask?.cases[0]
      : linkedTask?.cases;

    if (
      !linkedTask ||
      linkedTask.is_deleted ||
      !linkedCase ||
      linkedCase.status !== 'active' ||
      linkedCase.is_internal
    ) {
      return {
        ok: false,
        response: apiError(400, 'VALIDATION_ERROR', 'Linked task not found on an active client case.', [
          { field: 'linked_task_id', message: 'Linked task not found on an active client case.' },
        ]),
      };
    }

    linkedCaseId = linkedCase.id;

    const { data: staffProfile, error: staffError } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', input.staff_id!)
      .maybeSingle();

    if (staffError || !staffProfile) {
      return {
        ok: false,
        response: apiError(500, 'INTERNAL_ERROR', 'Failed to load staff profile.'),
      };
    }

    const auditLine = formatAdhocAuditNoteLine({
      timestamp: new Date(),
      staffName: staffProfile.full_name,
      taskName: nameResult.value,
      description: descriptionResult.value,
    });

    const { error: notesError } = await client
      .from('tasks')
      .update({ notes: appendTaskAuditNote(linkedTask.notes, auditLine) })
      .eq('id', linkedTask.id);

    if (notesError) {
      return {
        ok: false,
        response: apiError(500, 'INTERNAL_ERROR', 'Failed to append audit note to linked task.'),
      };
    }
  }

  return {
    ok: true,
    data: {
      task_id: createdTask.id,
      assignment_id: assignResult.data.assignment_id,
      case_id: INTERNAL_CASE_ID,
      staff_id: assignResult.data.staff_id,
      staff_name: assignResult.data.staff_name,
      date: assignResult.data.date,
      start_time: assignResult.data.start_time,
      end_time: assignResult.data.end_time,
      duration_minutes: assignResult.data.duration_minutes,
      linked_task_id: input.linked_task_id ?? null,
      linked_case_id: linkedCaseId,
    },
  };
}
