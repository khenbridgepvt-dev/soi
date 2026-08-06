import { requireAdminApiAuth } from '@/lib/api/auth';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';

/** EP-11b addendum · POST /api/schedule/adhoc-task-assign */
export async function POST(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    staff_id?: string;
    date?: string;
    start_time?: string;
    duration_minutes?: number;
    linked_task_id?: string;
  };

  const result = await createAdhocTaskAssign(auth.supabase, body);

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data }, { status: 201 });
}
