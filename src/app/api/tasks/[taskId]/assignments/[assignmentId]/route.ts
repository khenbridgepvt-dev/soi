import { requireAdminApiAuth } from '@/lib/api/auth';
import { releaseAssignment } from '@/lib/tasks/assign-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ taskId: string; assignmentId: string }>;
};

/** EP-58 · DELETE /api/tasks/:taskId/assignments/:assignmentId */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { taskId, assignmentId } = await context.params;
  if (!isUuid(taskId) || !isUuid(assignmentId)) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Assignment not found.' } },
      { status: 404 },
    );
  }

  const result = await releaseAssignment(auth.supabase, taskId, assignmentId);

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}
