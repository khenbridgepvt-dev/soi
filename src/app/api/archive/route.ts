import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchArchiveList } from '@/lib/archive/fetch-archive-list';
import { parseArchiveQuery } from '@/lib/archive/parse-archive-query';
import { buildPaginationMeta } from '@/lib/cases/list-query';

/** EP-39 · List soft-deleted records for the archive page. */
export async function GET(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const query = parseArchiveQuery(new URL(request.url).searchParams);

  try {
    const { rows, total } = await fetchArchiveList(auth.supabase, query);

    return Response.json({
      data: rows,
      pagination: buildPaginationMeta(query.page, query.limit, total),
    });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load archive records.');
  }
}
