import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDebounceController,
  SEARCH_DEBOUNCE_MS,
} from '@/lib/hooks/debounce';

describe('createDebounceController (ticket 0029)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits 300ms by default before invoking', async () => {
    vi.useFakeTimers();
    const onInvoke = vi.fn();
    const debounce = createDebounceController(SEARCH_DEBOUNCE_MS, onInvoke);

    debounce.schedule('alpha');
    debounce.schedule('beta');

    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
    expect(onInvoke).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onInvoke).toHaveBeenCalledTimes(1);
    expect(onInvoke).toHaveBeenCalledWith('beta');
  });

  it('cancels a pending invocation', async () => {
    vi.useFakeTimers();
    const onInvoke = vi.fn();
    const debounce = createDebounceController(300, onInvoke);

    debounce.schedule('pending');
    debounce.cancel();

    await vi.advanceTimersByTimeAsync(300);
    expect(onInvoke).not.toHaveBeenCalled();
  });
});
