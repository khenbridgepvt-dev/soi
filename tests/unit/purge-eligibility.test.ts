import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PURGE_RETENTION_DAYS,
  isPurgeEligible,
  purgeEligibilityCutoff,
} from '@/lib/archive/purge-eligibility';

describe('purge eligibility (ticket 0030, ADR-0011)', () => {
  const now = new Date('2026-08-02T12:00:00.000Z');

  it('defaults retention to 90 days', () => {
    expect(DEFAULT_PURGE_RETENTION_DAYS).toBe(90);
  });

  it('marks records deleted before the cutoff as eligible', () => {
    const deletedAt = '2026-04-01T10:00:00.000Z';
    expect(isPurgeEligible(deletedAt, now, 90)).toBe(true);
  });

  it('keeps recently deleted records ineligible', () => {
    const deletedAt = '2026-07-15T10:00:00.000Z';
    expect(isPurgeEligible(deletedAt, now, 90)).toBe(false);
  });

  it('computes the eligibility cutoff from a fixed now', () => {
    const cutoff = purgeEligibilityCutoff(now, 90);
    expect(cutoff.toISOString()).toBe('2026-05-04T12:00:00.000Z');
  });

  it('treats missing deleted_at as ineligible', () => {
    expect(isPurgeEligible(null, now, 90)).toBe(false);
  });
});
