import { requireAdminApiAuth } from '@/lib/api/auth';
import { assignTask } from '@/lib/tasks/assign-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-13 · POST /api/tasks/:id/assign */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, { status: 404 });
  }

  const body = (await request.json()) as {
    staff_id?: string;
    date?: string;
    start_time?: string;
    duration_minutes?: number;
  };

  const result = await assignTask(auth.supabase, id, {
    staff_id: body.staff_id ?? '',
    date: body.date ?? '',
    start_time: body.start_time ?? '',
    duration_minutes: body.duration_minutes ?? 0,
  });

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data }, { status: 201 });
}
