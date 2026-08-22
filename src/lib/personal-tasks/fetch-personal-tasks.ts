import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole } from '@/lib/auth/jwt';
import type { Database } from '@/types/database';
import { isUuid } from '@/lib/utils/lead-form';

export type PersonalTaskRecord = {
  id: string;
  created_by: string;
  title: string;
  notes: string | null;
  case_id: string | null;
  case_reference: string | null;
  case_is_internal: boolean;
  reminder_date: string | null;
  reminder_note: string | null;
  deadline_date: string | null;
  remind_days_before: number | null;
  created_at: string;
  updated_at: string;
};

type PersonalTaskRow = Database['public']['Tables']['staff_personal_tasks']['Row'] & {
  cases: {
    reference: string | null;
    is_internal: boolean;
  } | null;
};

export function parsePersonalTaskListQuery(searchParams: URLSearchParams): {
  staff_id?: string;
} {
  const staffId = searchParams.get('staff_id')?.trim();
  return staffId ? { staff_id: staffId } : {};
}

function mapRow(row: PersonalTaskRow): PersonalTaskRecord {
  const caseRow = Array.isArray(row.cases) ? row.cases[0] : row.cases;

  return {
    id: row.id,
    created_by: row.created_by,
    title: row.title,
    notes: row.notes,
    case_id: row.case_id,
    case_reference: caseRow?.reference ?? null,
    case_is_internal: caseRow?.is_internal === true,
    reminder_date: row.reminder_date,
    reminder_note: row.reminder_note,
    deadline_date: row.deadline_date,
    remind_days_before: row.remind_days_before,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT_FIELDS = `
  id,
  created_by,
  title,
  notes,
  case_id,
  reminder_date,
  reminder_note,
  deadline_date,
  remind_days_before,
  created_at,
  updated_at,
  cases (
    reference,
    is_internal
  )
`;

export async function fetchPersonalTasks(
  client: SupabaseClient<Database>,
  role: AppRole,
  userId: string,
  query: { staff_id?: string },
): Promise<PersonalTaskRecord[]> {
  let request = client
    .from('staff_personal_tasks')
    .select(SELECT_FIELDS)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (role === 'admin') {
    if (query.staff_id) {
      if (!isUuid(query.staff_id)) {
        return [];
      }
      request = request.eq('created_by', query.staff_id);
    }
  } else {
    request = request.eq('created_by', userId);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as PersonalTaskRow));
}

export async function fetchPersonalTaskById(
  client: SupabaseClient<Database>,
  taskId: string,
): Promise<PersonalTaskRecord | null> {
  const { data, error } = await client
    .from('staff_personal_tasks')
    .select(SELECT_FIELDS)
    .eq('id', taskId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRow(data as PersonalTaskRow);
}

export function personalTaskReminderValues(
  row: Pick<
    PersonalTaskRecord,
    'reminder_date' | 'reminder_note' | 'deadline_date' | 'remind_days_before'
  >,
) {
  return {
    reminder_date: row.reminder_date,
    reminder_note: row.reminder_note,
    deadline_date: row.deadline_date,
    remind_days_before: row.remind_days_before,
  };
}
