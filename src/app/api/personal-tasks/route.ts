import { requireApiAuth, requireStaffApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  fetchPersonalTasks,
  parsePersonalTaskListQuery,
} from '@/lib/personal-tasks/fetch-personal-tasks';
import {
  assertPersonalTaskCaseLink,
  parsePersonalTaskCreateInput,
} from '@/lib/personal-tasks/validate-personal-task';

/** EP-67 · GET /api/personal-tasks */
export async function GET(request: Request) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const query = parsePersonalTaskListQuery(new URL(request.url).searchParams);

  if (auth.role !== 'admin' && query.staff_id) {
    return apiError(403, 'FORBIDDEN', 'Only admins may filter by staff_id.');
  }

  try {
    const data = await fetchPersonalTasks(auth.supabase, auth.role, auth.userId, query);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load personal tasks.');
  }
}

/** EP-67 · POST /api/personal-tasks */
export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.');
  }

  const parsed = parsePersonalTaskCreateInput(body);
  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message, parsed.details);
  }

  const caseCheck = await assertPersonalTaskCaseLink(
    auth.supabase,
    auth.userId,
    parsed.value.case_id ?? null,
  );
  if (!caseCheck.ok) {
    return apiError(400, 'VALIDATION_ERROR', caseCheck.message, caseCheck.details);
  }

  const { data, error } = await auth.supabase
    .from('staff_personal_tasks')
    .insert({
      created_by: auth.userId,
      title: parsed.value.title,
      notes: parsed.value.notes ?? null,
      case_id: parsed.value.case_id ?? null,
      reminder_date: parsed.value.reminder_date ?? null,
      reminder_note: parsed.value.reminder_note ?? null,
      deadline_date: parsed.value.deadline_date ?? null,
      remind_days_before: parsed.value.remind_days_before ?? null,
    })
    .select(
      'id, created_by, title, notes, case_id, reminder_date, reminder_note, deadline_date, remind_days_before, created_at, updated_at',
    )
    .single();

  if (error) {
    if (error.message.toLowerCase().includes('case')) {
      return apiError(400, 'VALIDATION_ERROR', error.message);
    }
    return apiError(500, 'INTERNAL_ERROR', 'Failed to create personal task.');
  }

  return Response.json({ data }, { status: 201 });
}
