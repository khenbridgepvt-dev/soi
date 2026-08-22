import { describe, expect, it } from 'vitest';

import { caseReferenceLabel } from '@/components/reminders/RemindersList';
import { INTERNAL_CASE_REFERENCE } from '@/lib/cases/internal-case';

describe('caseReferenceLabel', () => {
  it('shows Firm task for the internal case reference', () => {
    expect(caseReferenceLabel(INTERNAL_CASE_REFERENCE)).toBe('Firm task');
  });

  it('shows the reference or fallback for other cases', () => {
    expect(caseReferenceLabel('ABC-123')).toBe('ABC-123');
    expect(caseReferenceLabel(null)).toBe('No reference');
  });
});
