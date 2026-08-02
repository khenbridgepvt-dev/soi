export type ParsedSearchQuery = {
  q: string;
  limit: number;
};

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  if (max !== undefined) {
    return Math.min(parsed, max);
  }

  return parsed;
}

/** EP-38 query parsing for `/api/search`. */
export function parseSearchQuery(searchParams: URLSearchParams): ParsedSearchQuery {
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = parsePositiveInt(searchParams.get('limit'), 8, 20);

  return { q, limit };
}
