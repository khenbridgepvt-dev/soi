import type { SupabaseClient } from '@supabase/supabase-js';

import { apiError } from '@/lib/api/response';
import { rejectIfInternalCase } from '@/lib/cases/guard-internal-case';
import type { Database } from '@/types/database';

import { fetchCaseDocumentContext } from './fetch-case-document-context';

type GuardOutcome =
  | {
      ok: true;
      context: NonNullable<Awaited<ReturnType<typeof fetchCaseDocumentContext>>>;
    }
  | { ok: false; response: Response };

export async function guardCaseDocumentAccess(
  client: SupabaseClient<Database>,
  caseId: string,
  options?: { requireWritable?: boolean },
): Promise<GuardOutcome> {
  const internalGuard = await rejectIfInternalCase(client, caseId);
  if (internalGuard) {
    return { ok: false, response: internalGuard };
  }

  const context = await fetchCaseDocumentContext(client, caseId);
  if (!context) {
    return {
      ok: false,
      response: apiError(404, 'NOT_FOUND', 'Case not found.'),
    };
  }

  if (
    options?.requireWritable &&
    (context.status === 'completed' || context.status === 'rejected')
  ) {
    return {
      ok: false,
      response: apiError(400, 'INVALID_STATE_TRANSITION', 'This case is read-only.'),
    };
  }

  return { ok: true, context };
}
