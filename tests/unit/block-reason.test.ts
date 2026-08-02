import { describe, expect, it } from 'vitest';
import { validateBlockReason, BLOCK_REASON_MAX } from '@/lib/utils/block-reason';

describe('validateBlockReason', () => {
  it('accepts a trimmed non-empty reason', () => {
    const result = validateBlockReason('  Client not responding  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('Client not responding');
    }
  });

  it('rejects missing or blank reasons', () => {
    expect(validateBlockReason(undefined).ok).toBe(false);
    expect(validateBlockReason('').ok).toBe(false);
    expect(validateBlockReason('   ').ok).toBe(false);
  });

  it(`rejects reasons longer than ${BLOCK_REASON_MAX} characters`, () => {
    const result = validateBlockReason('x'.repeat(BLOCK_REASON_MAX + 1));
    expect(result.ok).toBe(false);
  });
});
