import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { AppRole } from '@/lib/auth/jwt';

export type CaseDetailTask = {
  id: string;
  sequence: number;
  name: string;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  assigned_to: { id: string; full_name: string } | null;
  notes: string | null;
  is_overdue: boolean;
  blocked_at: string | null;
  completed_at: string | null;
  senior_approval: Database['public']['Enums']['senior_review_outcome'] | null;
  is_custom: boolean;
  current_assignment: null;
};

export type CaseDetailResponse = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  application_type: {
    id: string;
    name: string;
    code: string;
  };
  status: Database['public']['Enums']['case_status'];
  is_urgent: boolean;
  senior_revision_count: number;
  last_date: string | null;
  appointment_date: string | null;
  notes: string | null;
  created_by: { id: string; full_name: string } | null;
  accepted_at: string | null;
  created_at: string;
  dependants: Array<{ id: string; name: string; relationship: string }>;
  tasks: CaseDetailTask[];
  task_summary: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    blocked: number;
  };
  primary_staff_name: string | null;
};

type CaseRow = {
  id: string;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
  status: Database['public']['Enums']['case_status'];
  is_urgent: boolean;
  senior_revision_count: number;
  last_date: string | null;
  appointment_date: string | null;
  notes: string | null;
  accepted_at: string | null;
  created_at: string;
  created_by: string;
  application_types: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type TaskRow = {
  id: string;
  sequence: number;
  name: string;
  abbreviation: string;
  status: Database['public']['Enums']['task_status'];
  assigned_to: string | null;
  notes: string | null;
  is_overdue: boolean;
  blocked_at: string | null;
  completed_at: string | null;
  senior_approval: Database['public']['Enums']['senior_review_outcome'] | null;
  is_custom: boolean;
};

export async function fetchCaseDetail(
  supabase: SupabaseClient<Database>,
  caseId: string,
  role: AppRole,
): Promise<CaseDetailResponse | null> {
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select(
      `
        id,
        reference,
        client_first_name,
        client_last_name,
        status,
        is_urgent,
        is_internal,
        senior_revision_count,
        last_date,
        appointment_date,
        notes,
        accepted_at,
        created_at,
        created_by,
        application_types ( id, name, code )
      `,
    )
    .eq('id', caseId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (caseError || !caseRow) {
    return null;
  }

  if ((caseRow as { is_internal?: boolean }).is_internal === true) {
    return null;
  }

  const row = caseRow as CaseRow & {
    application_types:
      | { id: string; name: string; code: string }
      | { id: string; name: string; code: string }[]
      | null;
  };

  const applicationType = Array.isArray(row.application_types)
    ? row.application_types[0]
    : row.application_types;

  if (!applicationType) {
    return null;
  }

  const { data: dependants } = await supabase
    .from('dependants')
    .select('id, name, relationship')
    .eq('case_id', caseId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  const { data: taskRows } = await supabase
    .from('tasks')
    .select(
      'id, sequence, name, abbreviation, status, assigned_to, notes, is_overdue, blocked_at, completed_at, senior_approval, is_custom',
    )
    .eq('case_id', caseId)
    .order('sequence', { ascending: true });

  const tasks = (taskRows ?? []) as TaskRow[];
  const staffIds = [
    ...new Set(tasks.map((task) => task.assigned_to).filter((id): id is string => Boolean(id))),
  ];

  const profileNameById = new Map<string, string>();

  if (staffIds.length > 0) {
    const { data: staffProfiles } = await supabase
      .from('profiles_staff_view')
      .select('id, full_name')
      .in('id', staffIds);

    for (const profile of staffProfiles ?? []) {
      if (profile.id && profile.full_name) {
        profileNameById.set(profile.id, profile.full_name);
      }
    }
  }

  let createdBy: { id: string; full_name: string } | null = null;
  if (role === 'admin') {
    const { data: creator } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', row.created_by)
      .maybeSingle();

    if (creator) {
      createdBy = { id: creator.id, full_name: creator.full_name ?? 'Unknown' };
    }
  }

  const mappedTasks: CaseDetailTask[] = tasks.map((task) => ({
    id: task.id,
    sequence: task.sequence,
    name: task.name,
    abbreviation: task.abbreviation,
    status: task.status,
    assigned_to: task.assigned_to
      ? {
          id: task.assigned_to,
          full_name: profileNameById.get(task.assigned_to) ?? 'Unknown',
        }
      : null,
    notes: task.notes,
    is_overdue: task.is_overdue,
    blocked_at: task.blocked_at,
    completed_at: task.completed_at,
    senior_approval: task.senior_approval,
    is_custom: task.is_custom,
    current_assignment: null,
  }));

  const taskSummary = {
    total: mappedTasks.length,
    completed: mappedTasks.filter((task) => task.status === 'completed').length,
    in_progress: mappedTasks.filter((task) => task.status === 'in_progress').length,
    not_started: mappedTasks.filter((task) => task.status === 'not_started').length,
    blocked: mappedTasks.filter((task) => task.status === 'blocked').length,
  };

  const staffFrequency = new Map<string, number>();
  for (const task of mappedTasks) {
    if (task.assigned_to) {
      staffFrequency.set(
        task.assigned_to.full_name,
        (staffFrequency.get(task.assigned_to.full_name) ?? 0) + 1,
      );
    }
  }

  let primaryStaffName: string | null = null;
  let maxCount = 0;
  for (const [name, count] of staffFrequency.entries()) {
    if (count > maxCount) {
      maxCount = count;
      primaryStaffName = name;
    }
  }

  return {
    id: row.id,
    reference: row.reference,
    client_first_name: row.client_first_name,
    client_last_name: row.client_last_name,
    application_type: applicationType,
    status: row.status,
    is_urgent: row.is_urgent,
    senior_revision_count: row.senior_revision_count,
    last_date: row.last_date,
    appointment_date: row.appointment_date,
    notes: row.notes,
    created_by: createdBy,
    accepted_at: row.accepted_at,
    created_at: row.created_at,
    dependants: dependants ?? [],
    tasks: mappedTasks,
    task_summary: taskSummary,
    primary_staff_name: primaryStaffName,
  };
}
