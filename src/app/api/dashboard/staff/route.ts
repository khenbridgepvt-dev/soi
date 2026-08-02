import { requireStaffApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  fetchStaffDashboard,
  type StaffDashboardView,
} from '@/lib/dashboard/fetch-staff-dashboard';

const VIEWS = new Set<StaffDashboardView>(['today', 'week', 'all']);

/** EP-43 · Staff dashboard priority list for S-10. */
export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const viewParam = new URL(request.url).searchParams.get('view') ?? 'today';
  const view = VIEWS.has(viewParam as StaffDashboardView)
    ? (viewParam as StaffDashboardView)
    : 'today';

  try {
    const data = await fetchStaffDashboard(auth.supabase, auth.userId, view);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load staff dashboard.');
  }
}
