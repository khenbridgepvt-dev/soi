export const DEFAULT_PURGE_RETENTION_DAYS = 90;

/** ADR-0011 — records deleted before this cutoff are eligible for purge. */
export function purgeEligibilityCutoff(now: Date, retentionDays: number): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

export function isPurgeEligible(
  deletedAt: string | null | undefined,
  now: Date,
  retentionDays: number = DEFAULT_PURGE_RETENTION_DAYS,
): boolean {
  if (!deletedAt) {
    return false;
  }

  return new Date(deletedAt) < purgeEligibilityCutoff(now, retentionDays);
}
