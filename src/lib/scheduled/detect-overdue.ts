import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { fanoutTaskOverdueNotification } from '@/lib/notifications';
import { buildTaskOverdueNotificationRows } from '@/lib/notifications/fanout';

export type OverdueCandidate = {
  taskId: string;
  caseId: string;
  userId: string;
  taskName: string;
  taskAbbreviation: string;
  caseReference: string;
  assignmentDate: string;
  endTime: string;
};

/** Combine assignment date + end time into a UTC instant for comparison. */
export function assignmentDueInstant(assignmentDate: string, endTime: string): Date {
  const normalized = endTime.slice(0, 5);
  return new Date(`${assignmentDate}T${normalized}:00.000Z`);
}

export function isAssignmentOverdue(
  assignmentDate: string,
  endTime: string,
  now: Date,
): boolean {
  return assignmentDueInstant(assignmentDate, endTime).getTime() < now.getTime();
}

type AssignmentRow = {
  date: string;
  end_time: string;
  staff_id: string;
  tasks: {
    id: string;
    name: string;
    abbreviation: string;
    status: Database['public']['Enums']['task_status'];
    is_overdue: boolean;
    is_deleted: boolean;
    assigned_to: string | null;
    case_id: string;
    cases: {
      reference: string | null;
    } | null;
  } | null;
};

export function mapOverdueCandidates(rows: AssignmentRow[], now: Date): OverdueCandidate[] {
  const candidates: OverdueCandidate[] = [];

  for (const row of rows) {
    const task = row.tasks;
    if (!task || task.is_deleted || task.is_overdue) {
      continue;
    }

    if (!['not_started', 'in_progress'].includes(task.status)) {
      continue;
    }

    if (!task.assigned_to || task.assigned_to !== row.staff_id) {
      continue;
    }

    if (!isAssignmentOverdue(row.date, row.end_time, now)) {
      continue;
    }

    candidates.push({
      taskId: task.id,
      caseId: task.case_id,
      userId: task.assigned_to,
      taskName: task.name,
      taskAbbreviation: task.abbreviation,
      caseReference: task.cases?.reference ?? '—',
      assignmentDate: row.date,
      endTime: row.end_time,
    });
  }

  return candidates;
}

export type DetectOverdueResult = {
  flagged: number;
  notifications_sent: number;
};

/** US-7.3 / deployment_guide §11.1 — flag overdue tasks and notify assignees once. */
export async function runDetectOverdue(
  client: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<DetectOverdueResult> {
  const { data, error } = await client
    .from('task_assignments')
    .select(
      `
      date,
      end_time,
      staff_id,
      tasks!inner(
        id,
        name,
        abbreviation,
        status,
        is_overdue,
        is_deleted,
        assigned_to,
        case_id,
        cases!inner(reference)
      )
    `,
    )
    .eq('is_released', false)
    .eq('tasks.is_deleted', false)
    .eq('tasks.is_overdue', false)
    .in('tasks.status', ['not_started', 'in_progress']);

  if (error) {
    throw error;
  }

  const candidates = mapOverdueCandidates((data ?? []) as AssignmentRow[], now);
  const uniqueByTask = new Map(candidates.map((row) => [row.taskId, row]));

  let notificationsSent = 0;

  for (const candidate of uniqueByTask.values()) {
    const { error: updateError } = await client
      .from('tasks')
      .update({ is_overdue: true })
      .eq('id', candidate.taskId)
      .eq('is_overdue', false);

    if (updateError) {
      throw updateError;
    }

    notificationsSent += await fanoutTaskOverdueNotification({
      userId: candidate.userId,
      taskId: candidate.taskId,
      caseId: candidate.caseId,
      taskName: candidate.taskAbbreviation,
      caseReference: candidate.caseReference,
      endTime: candidate.endTime,
      service: client,
    });
  }

  return {
    flagged: uniqueByTask.size,
    notifications_sent: notificationsSent,
  };
}

// Re-export builders for tests that assert payload shape without DB writes.
export { buildTaskOverdueNotificationRows };
