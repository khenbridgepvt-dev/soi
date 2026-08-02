import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAutoSaveController,
  type AutoSaveStatus,
} from '@/lib/utils/auto-save';

describe('createAutoSaveController', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces save calls', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => {});
    const controller = createAutoSaveController({ onSave, debounceMs: 1000 });

    controller.schedule('first');
    controller.schedule('second');
    controller.schedule('third');

    expect(controller.getStatus()).toBe('pending');
    expect(onSave).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(999);
    expect(onSave).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('third');
    expect(controller.getStatus()).toBe('saved');
  });

  it('flushes pending work immediately', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => {});
    const controller = createAutoSaveController({ onSave, debounceMs: 1000 });

    controller.schedule('draft');
    await controller.flush();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('draft');
    expect(controller.getStatus()).toBe('saved');
  });

  it('tracks saving and error states', async () => {
    vi.useFakeTimers();
    const statuses: AutoSaveStatus[] = [];
    const onSave = vi.fn(async () => {
      throw new Error('network');
    });
    const controller = createAutoSaveController({
      onSave,
      debounceMs: 100,
      onStatusChange: (status) => statuses.push(status),
    });

    controller.schedule('oops');
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();

    expect(statuses).toContain('saving');
    expect(statuses).toContain('error');
    expect(controller.getStatus()).toBe('error');
  });

  it('skips save when value is unchanged from last saved value', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => {});
    const controller = createAutoSaveController({ onSave, debounceMs: 100 });

    controller.schedule('same');
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();

    controller.schedule('same');
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not schedule when disabled', () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => {});
    const controller = createAutoSaveController({
      onSave,
      debounceMs: 100,
      disabled: true,
    });

    controller.schedule('blocked');
    vi.advanceTimersByTime(200);

    expect(onSave).not.toHaveBeenCalled();
    expect(controller.getStatus()).toBe('idle');
  });

  it('retries failed saves with exponential backoff', async () => {
    vi.useFakeTimers();
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    const controller = createAutoSaveController({ onSave, debounceMs: 100 });

    controller.schedule('retry me');
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(3);
    expect(controller.getStatus()).toBe('saved');
  });

  it('rolls back via onError after retries are exhausted', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const onSave = vi.fn(async () => {
      throw new Error('network');
    });
    const controller = createAutoSaveController({
      onSave,
      debounceMs: 100,
      onError,
    });

    controller.schedule('draft');
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(4);
    expect(onError).toHaveBeenCalledWith('draft', undefined);
    expect(controller.getStatus()).toBe('error');
  });
});
