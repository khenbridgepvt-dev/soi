import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchAdminDashboard } from '@/lib/dashboard/fetch-admin-dashboard';

/** EP-42 · Admin dashboard summary for S-02. */
export async function GET() {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const data = await fetchAdminDashboard(auth.supabase);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load admin dashboard.');
  }
}
