import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchGlobalSearch } from '@/lib/search/fetch-global-search';
import { parseSearchQuery } from '@/lib/search/parse-search-query';

/** EP-38 · Global search across cases (reference, client name, assigned staff). */
export async function GET(request: Request) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { q, limit } = parseSearchQuery(new URL(request.url).searchParams);

  if (q.length < 2) {
    return Response.json({ data: [] });
  }

  try {
    const data = await fetchGlobalSearch(auth.supabase, { q, limit });
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to search cases.');
  }
}
