import { requireAdminApiAuth } from '@/lib/api/auth';
import { releaseAssignment } from '@/lib/tasks/assign-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>;
};

/** EP-58 · DELETE /api/tasks/:id/assignments/:assignmentId */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id, assignmentId } = await context.params;
  if (!isUuid(id) || !isUuid(assignmentId)) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Assignment not found.' } },
      { status: 404 },
    );
  }

  const result = await releaseAssignment(auth.supabase, id, assignmentId);

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}
