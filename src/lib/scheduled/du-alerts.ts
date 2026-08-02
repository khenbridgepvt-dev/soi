import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { fanoutDuAlertNotifications } from '@/lib/notifications';
import { buildDuAlertNotificationRows } from '@/lib/notifications/fanout';
import {
  DU_TASK_SEQUENCES,
  duAlertSeverity,
} from '@/lib/scheduled/du-escalation';
import { workingDaysUntil } from '@/lib/utils/working-days';

type DuTaskRow = {
  id: string;
  sequence: number;
  name: string;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  cases: {
    id: string;
    reference: string | null;
    appointment_date: string | null;
    status: Database['public']['Enums']['case_status'];
    is_deleted: boolean;
  } | null;
};

export type DuAlertCandidate = {
  taskId: string;
  caseId: string;
  staffId: string | null;
  taskName: string;
  caseReference: string;
  appointmentDate: string;
  severity: 'warning' | 'critical';
  workingDaysRemaining: number;
};

export function mapDuAlertCandidates(rows: DuTaskRow[], today: string): DuAlertCandidate[] {
  const candidates: DuAlertCandidate[] = [];

  for (const row of rows) {
    const caseRow = row.cases;
    if (!caseRow?.appointment_date || caseRow.is_deleted || caseRow.status !== 'active') {
      continue;
    }

    if (!DU_TASK_SEQUENCES.includes(row.sequence as 12 | 13)) {
      continue;
    }

    if (!['not_started', 'in_progress'].includes(row.status)) {
      continue;
    }

    const appointmentDate = caseRow.appointment_date.slice(0, 10);
    const severity = duAlertSeverity(appointmentDate, today);
    if (!severity) {
      continue;
    }

    candidates.push({
      taskId: row.id,
      caseId: caseRow.id,
      staffId: row.assigned_to,
      taskName: row.abbreviation,
      caseReference: caseRow.reference ?? '—',
      appointmentDate,
      severity,
      workingDaysRemaining: workingDaysUntil(today, appointmentDate),
    });
  }

  return candidates;
}

export type DuAlertsResult = {
  alerts_sent: number;
  tasks_checked: number;
};

/** ADR-0007 / SRS §5.5 — daily DU escalation notifications for Tasks 12/13. */
export async function runDuAlerts(
  client: SupabaseClient<Database>,
  today: string,
): Promise<DuAlertsResult> {
  const { data: tasks, error: taskError } = await client
    .from('tasks')
    .select(
      `
      id,
      sequence,
      name,
      abbreviation,
      status,
      assigned_to,
      cases(
        id,
        reference,
        appointment_date,
        status,
        is_deleted
      )
    `,
    )
    .in('sequence', [...DU_TASK_SEQUENCES])
    .in('status', ['not_started', 'in_progress'])
    .eq('is_deleted', false);

  if (taskError) {
    throw taskError;
  }

  const eligible = ((tasks ?? []) as DuTaskRow[]).filter((row) => {
    const caseRow = row.cases;
    return (
      caseRow &&
      caseRow.appointment_date &&
      !caseRow.is_deleted &&
      caseRow.status === 'active'
    );
  });

  const candidates = mapDuAlertCandidates(eligible, today);

  const { data: admins, error: adminError } = await client
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (adminError) {
    throw adminError;
  }

  const adminIds = (admins ?? []).map((row) => row.id);
  let alertsSent = 0;

  for (const candidate of candidates) {
    const recipientIds = new Set(adminIds);
    if (candidate.staffId) {
      recipientIds.add(candidate.staffId);
    }

    alertsSent += await fanoutDuAlertNotifications({
      recipientIds: [...recipientIds],
      taskId: candidate.taskId,
      caseId: candidate.caseId,
      taskName: candidate.taskName,
      caseReference: candidate.caseReference,
      appointmentDate: candidate.appointmentDate,
      severity: candidate.severity,
      alertDate: today,
      workingDaysRemaining: candidate.workingDaysRemaining,
      service: client,
    });
  }

  return {
    alerts_sent: alertsSent,
    tasks_checked: candidates.length,
  };
}

export { buildDuAlertNotificationRows };
