import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchTaskBoard } from '@/lib/task-board/fetch-task-board';

/** Task board data for S-03 (columns = staff + unassigned). */
export async function GET() {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const data = await fetchTaskBoard(auth.supabase);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load task board.');
  }
}
