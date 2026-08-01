import { describe, expect, it } from 'vitest';
import {
  buildSeniorRevisionAdminAlertMessage,
  DEFAULT_SENIOR_REVISION_ALERT_THRESHOLD,
  REVISION_NOTES_MAX,
  shouldAlertAdminsOnRevisionCount,
  validateRevisionNotes,
  validateSeniorReviewOutcome,
} from '@/lib/senior-review/revision';

describe('shouldAlertAdminsOnRevisionCount', () => {
  it('returns false below the default threshold', () => {
    expect(shouldAlertAdminsOnRevisionCount(0)).toBe(false);
    expect(shouldAlertAdminsOnRevisionCount(1)).toBe(false);
    expect(shouldAlertAdminsOnRevisionCount(2)).toBe(false);
  });

  it('returns true at and above the default threshold', () => {
    expect(shouldAlertAdminsOnRevisionCount(3)).toBe(true);
    expect(shouldAlertAdminsOnRevisionCount(4)).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(shouldAlertAdminsOnRevisionCount(2, 2)).toBe(true);
    expect(shouldAlertAdminsOnRevisionCount(1, 2)).toBe(false);
  });

  it('uses the documented default of 3', () => {
    expect(DEFAULT_SENIOR_REVISION_ALERT_THRESHOLD).toBe(3);
  });
});

describe('buildSeniorRevisionAdminAlertMessage', () => {
  it('includes reference and revision count', () => {
    const message = buildSeniorRevisionAdminAlertMessage('072601/SKW/VIS', 3);
    expect(message).toContain('072601/SKW/VIS');
    expect(message).toContain('3');
    expect(message).toContain('senior review revision cycles');
  });
});

describe('validateSeniorReviewOutcome', () => {
  it('accepts approved and revisions_required', () => {
    expect(validateSeniorReviewOutcome('approved')).toEqual({
      ok: true,
      value: 'approved',
    });
    expect(validateSeniorReviewOutcome('revisions_required')).toEqual({
      ok: true,
      value: 'revisions_required',
    });
  });

  it('rejects other values', () => {
    const result = validateSeniorReviewOutcome('pending');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('approved');
    }
  });
});

describe('validateRevisionNotes', () => {
  it('allows empty notes when approving', () => {
    expect(validateRevisionNotes(null, 'approved')).toEqual({ ok: true, value: null });
    expect(validateRevisionNotes('', 'approved')).toEqual({ ok: true, value: null });
  });

  it('requires notes when revisions are required', () => {
    const result = validateRevisionNotes('', 'revisions_required');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('required');
    }
  });

  it('rejects notes longer than the maximum', () => {
    const long = 'x'.repeat(REVISION_NOTES_MAX + 1);
    const result = validateRevisionNotes(long, 'revisions_required');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(REVISION_NOTES_MAX));
    }
  });

  it('trimmed notes are returned when valid', () => {
    expect(validateRevisionNotes('  fix cover letter  ', 'revisions_required')).toEqual({
      ok: true,
      value: 'fix cover letter',
    });
  });
});
