import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { todayISODate } from '@/lib/utils/dates';

export type AdminDashboardPendingLead = {
  id: string;
  client_name: string;
  application_type: string;
  created_at: string;
};

export type AdminDashboardTeamStatus = {
  id: string;
  full_name: string;
  online_status: Database['public']['Enums']['online_status'];
  active_task_count: number;
  is_on_leave: boolean;
};

export type AdminDashboardScheduleSummary = {
  staff_id: string;
  staff_name: string;
  booked_hours: number;
  available_hours: number;
  total_hours: number;
  is_on_leave: boolean;
};

export type AdminDashboardPayload = {
  active_cases: number;
  urgent_cases: number;
  blocked_tasks: number;
  overdue_tasks: number;
  pending_leads: AdminDashboardPendingLead[];
  team_status: AdminDashboardTeamStatus[];
  schedule_summary: AdminDashboardScheduleSummary[];
};

export async function fetchAdminDashboard(
  client: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<AdminDashboardPayload> {
  const today = todayISODate(now);

  const [
    { count: activeCases, error: activeCasesError },
    { count: urgentCases, error: urgentCasesError },
    { count: blockedTasks, error: blockedTasksError },
    { count: overdueTasks, error: overdueTasksError },
    { data: pendingLeadRows, error: pendingLeadsError },
    { data: staffProfiles, error: staffError },
    { data: activeTasks, error: activeTasksError },
  ] = await Promise.all([
    client
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_deleted', false)
      .eq('is_internal', false),
    client
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_deleted', false)
      .eq('is_urgent', true)
      .eq('is_internal', false),
    client
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'blocked')
      .eq('is_deleted', false),
    client
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('is_overdue', true)
      .eq('is_deleted', false)
      .neq('status', 'completed'),
    client
      .from('cases')
      .select(
        `
        id,
        client_first_name,
        client_last_name,
        created_at,
        application_types ( name )
      `,
      )
      .eq('status', 'lead_pending')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5),
    client
      .from('profiles')
      .select('id, full_name, online_status')
      .eq('is_active', true)
      .in('role', ['staff', 'senior'])
      .order('full_name', { ascending: true }),
    client
      .from('tasks')
      .select('assigned_to, case_id')
      .eq('is_deleted', false)
      .in('status', ['not_started', 'in_progress', 'blocked']),
  ]);

  if (
    activeCasesError ||
    urgentCasesError ||
    blockedTasksError ||
    overdueTasksError ||
    pendingLeadsError ||
    staffError ||
    activeTasksError
  ) {
    throw (
      activeCasesError ??
      urgentCasesError ??
      blockedTasksError ??
      overdueTasksError ??
      pendingLeadsError ??
      staffError ??
      activeTasksError
    );
  }

  const { data: activeCaseRows } = await client
    .from('cases')
    .select('id')
    .eq('status', 'active')
    .eq('is_deleted', false)
    .eq('is_internal', false);

  const activeCaseIds = new Set((activeCaseRows ?? []).map((row) => row.id));

  const taskCountByStaff = new Map<string, number>();

  for (const task of activeTasks ?? []) {
    if (!task.assigned_to || !task.case_id || !activeCaseIds.has(task.case_id)) {
      continue;
    }

    taskCountByStaff.set(
      task.assigned_to,
      (taskCountByStaff.get(task.assigned_to) ?? 0) + 1,
    );
  }

  const pending_leads: AdminDashboardPendingLead[] = (pendingLeadRows ?? []).map((row) => {
    const applicationType = Array.isArray(row.application_types)
      ? row.application_types[0]
      : row.application_types;

    return {
      id: row.id,
      client_name: `${row.client_first_name} ${row.client_last_name}`.trim(),
      application_type: applicationType?.name ?? 'Unknown',
      created_at: row.created_at,
    };
  });

  const team_status: AdminDashboardTeamStatus[] = (staffProfiles ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    online_status: profile.online_status,
    active_task_count: taskCountByStaff.get(profile.id) ?? 0,
    is_on_leave: false,
  }));

  const schedule = await fetchSchedule(client, today);

  const schedule_summary: AdminDashboardScheduleSummary[] = schedule.staff.map((member) => {
    const totalHours = member.working_minutes / 60;
    const bookedHours = member.booked_minutes / 60;
    const availableHours = Math.max(totalHours - bookedHours, 0);

    return {
      staff_id: member.id,
      staff_name: member.full_name,
      booked_hours: Math.round(bookedHours * 10) / 10,
      available_hours: Math.round(availableHours * 10) / 10,
      total_hours: Math.round(totalHours * 10) / 10,
      is_on_leave: member.is_on_leave,
    };
  });

  return {
    active_cases: activeCases ?? 0,
    urgent_cases: urgentCases ?? 0,
    blocked_tasks: blockedTasks ?? 0,
    overdue_tasks: overdueTasks ?? 0,
    pending_leads,
    team_status,
    schedule_summary,
  };
}
