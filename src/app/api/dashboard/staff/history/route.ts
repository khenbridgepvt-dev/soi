import { requireStaffApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchStaffDashboardHistory } from '@/lib/dashboard/fetch-staff-dashboard-history';

/** EP-43 addendum · Paginated completed task history for staff dashboard. */
export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const cursor = searchParams.get('cursor');
  const internalOnly = searchParams.get('internalOnly') === 'true';

  if (limitParam && (Number.isNaN(limit) || limit! < 1)) {
    return apiError(400, 'VALIDATION_ERROR', 'limit must be a positive number.', [
      { field: 'limit', message: 'limit must be a positive number.' },
    ]);
  }

  try {
    const data = await fetchStaffDashboardHistory(auth.supabase, auth.userId, {
      limit,
      cursor,
      internalOnly,
    });

    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load task history.');
  }
}
