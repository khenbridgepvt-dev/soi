export const DEFAULT_SENIOR_REVISION_ALERT_THRESHOLD = 3;

export const REVISION_NOTES_MAX = 1000;

export function shouldAlertAdminsOnRevisionCount(
  revisionCount: number,
  threshold = DEFAULT_SENIOR_REVISION_ALERT_THRESHOLD,
): boolean {
  return revisionCount >= threshold;
}

export function buildSeniorRevisionAdminAlertMessage(
  reference: string,
  revisionCount: number,
): string {
  return `Case ${reference} has had ${revisionCount} senior review revision cycles — review may be needed.`;
}

export type SeniorReviewOutcome = 'approved' | 'revisions_required';

export function validateSeniorReviewOutcome(
  input: string | undefined,
): { ok: true; value: SeniorReviewOutcome } | { ok: false; message: string } {
  if (input === 'approved' || input === 'revisions_required') {
    return { ok: true, value: input };
  }

  return { ok: false, message: 'outcome must be approved or revisions_required.' };
}

export function validateRevisionNotes(
  input: string | undefined | null,
  outcome: SeniorReviewOutcome,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (outcome !== 'revisions_required') {
    return { ok: true, value: null };
  }

  const value = (input ?? '').trim();
  if (!value) {
    return { ok: false, message: 'Revision notes are required when requesting revisions.' };
  }

  if (value.length > REVISION_NOTES_MAX) {
    return {
      ok: false,
      message: `Revision notes must be at most ${REVISION_NOTES_MAX} characters.`,
    };
  }

  return { ok: true, value };
}
