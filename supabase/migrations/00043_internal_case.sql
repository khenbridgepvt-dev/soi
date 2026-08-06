-- Ticket 0043: internal case for ad-hoc schedule work (ADR-0019)

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Internal case row is seeded in supabase/seed.sql (requires profiles.created_by FK).

-- Exclude internal cases from global search (EP-38).
CREATE OR REPLACE FUNCTION public.search_cases(
  p_query text,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  reference text,
  client_name text,
  status public.case_status,
  is_urgent boolean,
  assigned_staff text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT
      trim(p_query) AS q,
      LEAST(GREATEST(COALESCE(p_limit, 8), 1), 20) AS lim
  ),
  matched AS (
    SELECT
      c.id,
      c.reference,
      (c.client_first_name || ' ' || c.client_last_name) AS client_name,
      c.status,
      c.is_urgent,
      (
        SELECT p.full_name
        FROM public.tasks t
        JOIN public.profiles p ON p.id = t.assigned_to
        WHERE t.case_id = c.id
          AND t.is_deleted = false
          AND t.assigned_to IS NOT NULL
        ORDER BY t.sequence
        LIMIT 1
      ) AS assigned_staff,
      GREATEST(
        similarity(COALESCE(c.reference, ''), n.q),
        similarity(c.client_first_name || ' ' || c.client_last_name, n.q),
        COALESCE(
          (
            SELECT MAX(similarity(p.full_name, n.q))
            FROM public.tasks t
            JOIN public.profiles p ON p.id = t.assigned_to
            WHERE t.case_id = c.id
              AND t.is_deleted = false
              AND t.assigned_to IS NOT NULL
          ),
          0
        )
      ) AS score
    FROM public.cases c
    CROSS JOIN normalized n
    WHERE c.is_deleted = false
      AND c.is_internal = false
      AND length(n.q) >= 2
      AND (
        COALESCE(c.reference, '') ILIKE '%' || n.q || '%'
        OR (c.client_first_name || ' ' || c.client_last_name) % n.q
        OR similarity(c.client_first_name || ' ' || c.client_last_name, n.q) > 0.2
        OR EXISTS (
          SELECT 1
          FROM public.tasks t
          JOIN public.profiles p ON p.id = t.assigned_to
          WHERE t.case_id = c.id
            AND t.is_deleted = false
            AND t.assigned_to IS NOT NULL
            AND (
              p.full_name % n.q
              OR p.full_name ILIKE '%' || n.q || '%'
            )
        )
      )
  )
  SELECT
    m.id,
    m.reference,
    m.client_name,
    m.status,
    m.is_urgent,
    m.assigned_staff
  FROM matched m
  ORDER BY m.score DESC, m.reference NULLS LAST
  LIMIT (SELECT lim FROM normalized);
$$;
