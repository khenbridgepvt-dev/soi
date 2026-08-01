import { describe, expect, it } from 'vitest';
import { mapAcceptLeadError } from '@/lib/cases/accept-errors';

describe('mapAcceptLeadError', () => {
  it('maps a missing case to 404 (EP-05)', () => {
    expect(
      mapAcceptLeadError({ code: 'P0002', message: 'CASE_NOT_FOUND: no live case' }),
    ).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('maps a non-lead_pending case to 400 (TC-021, TC-033)', () => {
    expect(
      mapAcceptLeadError({
        code: 'P0001',
        message: 'INVALID_STATE_TRANSITION: case is active, not lead_pending',
      }),
    ).toMatchObject({ status: 400, code: 'INVALID_STATE_TRANSITION' });
  });

  it('maps a non-admin caller to 403', () => {
    expect(
      mapAcceptLeadError({ code: '42501', message: 'FORBIDDEN: only an active admin' }),
    ).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('maps a reference collision to REFERENCE_GENERATION_FAILED', () => {
    expect(
      mapAcceptLeadError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "idx_cases_reference"',
      }),
    ).toMatchObject({ status: 500, code: 'REFERENCE_GENERATION_FAILED' });
  });

  it('falls back to INTERNAL_ERROR and says nothing was written', () => {
    const mapped = mapAcceptLeadError({ code: 'XX000', message: 'boom' });
    expect(mapped).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    expect(mapped.message).toContain('No changes were made');

    expect(mapAcceptLeadError(null)).toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
