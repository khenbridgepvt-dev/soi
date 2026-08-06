import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { formatWorkingHours } from '@/lib/staff/working-hours';

export type StaffListItem = {
  id: string;
  full_name: string;
  email: string;
  role: Database['public']['Enums']['user_role'];
  is_active: boolean;
  online_status: Database['public']['Enums']['online_status'];
  active_case_count: number;
  tasks_today_count: number;
  overdue_count: number;
  blocked_count: number;
  working_hours: string;
};

export type StaffListFilters = {
  is_active?: boolean;
  role?: Database['public']['Enums']['user_role'];
};

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchStaffList(
  profilesClient: SupabaseClient<Database>,
  serviceClient: SupabaseClient<Database>,
  filters: StaffListFilters = {},
): Promise<StaffListItem[]> {
  let profileQuery = profilesClient
    .from('profiles')
    .select('id, full_name, email, role, is_active, online_status')
    .order('full_name', { ascending: true });

  if (filters.is_active !== undefined) {
    profileQuery = profileQuery.eq('is_active', filters.is_active);
  }

  if (filters.role) {
    profileQuery = profileQuery.eq('role', filters.role);
  }

  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError || !profiles) {
    throw profileError ?? new Error('Failed to load staff profiles.');
  }

  const staffIds = profiles.map((row) => row.id);
  if (staffIds.length === 0) {
    return [];
  }

  const { data: timetables } = await serviceClient
    .from('staff_timetables')
    .select('staff_id, mon_start, mon_end, fri_start, fri_end')
    .in('staff_id', staffIds);

  const timetableByStaff = new Map(
    (timetables ?? []).map((row) => [row.staff_id, row]),
  );

  const { data: tasks } = await profilesClient
    .from('tasks')
    .select('assigned_to, case_id, status, is_overdue, is_deleted')
    .in('assigned_to', staffIds)
    .eq('is_deleted', false);

  const { data: activeCases } = await profilesClient
    .from('cases')
    .select('id')
    .eq('status', 'active')
    .eq('is_deleted', false)
    .eq('is_internal', false);

  const activeCaseIds = new Set((activeCases ?? []).map((row) => row.id));
  const today = todayDateString();

  const { data: todayAssignments } = await serviceClient
    .from('task_assignments')
    .select('staff_id')
    .in('staff_id', staffIds)
    .eq('date', today);

  const todayCountByStaff = new Map<string, number>();
  for (const row of todayAssignments ?? []) {
    todayCountByStaff.set(row.staff_id, (todayCountByStaff.get(row.staff_id) ?? 0) + 1);
  }

  const metrics = new Map<
    string,
    { activeCases: Set<string>; overdue: number; blocked: number }
  >();

  for (const staffId of staffIds) {
    metrics.set(staffId, { activeCases: new Set(), overdue: 0, blocked: 0 });
  }

  for (const task of tasks ?? []) {
    if (!task.assigned_to) {
      continue;
    }

    const entry = metrics.get(task.assigned_to);
    if (!entry) {
      continue;
    }

    if (task.case_id && activeCaseIds.has(task.case_id)) {
      entry.activeCases.add(task.case_id);
    }

    if (task.is_overdue && task.status !== 'completed') {
      entry.overdue += 1;
    }

    if (task.status === 'blocked') {
      entry.blocked += 1;
    }
  }

  return profiles.map((profile) => {
    const counts = metrics.get(profile.id) ?? {
      activeCases: new Set<string>(),
      overdue: 0,
      blocked: 0,
    };

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      is_active: profile.is_active,
      online_status: profile.online_status,
      active_case_count: counts.activeCases.size,
      tasks_today_count: todayCountByStaff.get(profile.id) ?? 0,
      overdue_count: counts.overdue,
      blocked_count: counts.blocked,
      working_hours: formatWorkingHours(timetableByStaff.get(profile.id)),
    };
  });
}
