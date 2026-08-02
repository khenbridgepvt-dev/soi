'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AUTO_SAVE_DEFAULT_DEBOUNCE_MS,
  AUTO_SAVE_SAVED_DISPLAY_MS,
  createAutoSaveController,
  type AutoSaveStatus,
} from '@/lib/utils/auto-save';

type UseAutoSaveOptions<T> = {
  onSave: (value: T) => Promise<void>;
  debounceMs?: number;
  disabled?: boolean;
  onError?: (value: T, lastSavedValue: T | undefined) => void;
};

type UseAutoSaveResult<T> = {
  status: AutoSaveStatus;
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  reset: (lastSavedValue?: T) => void;
};

export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveResult<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const onSaveRef = useRef(options.onSave);
  onSaveRef.current = options.onSave;

  const controller = useMemo(
    () =>
      createAutoSaveController<T>({
        debounceMs: options.debounceMs ?? AUTO_SAVE_DEFAULT_DEBOUNCE_MS,
        disabled: options.disabled,
        onError: options.onError,
        onStatusChange: setStatus,
        onSave: async (value) => onSaveRef.current(value),
      }),
    [options.debounceMs, options.disabled, options.onError],
  );

  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  useEffect(() => {
    return () => {
      controllerRef.current.flush();
    };
  }, []);

  useEffect(() => {
    if (status !== 'saved') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setStatus('idle');
    }, AUTO_SAVE_SAVED_DISPLAY_MS);

    return () => clearTimeout(timeout);
  }, [status]);

  const schedule = useCallback((value: T) => {
    controllerRef.current.schedule(value);
  }, []);

  const flush = useCallback(() => controllerRef.current.flush(), []);

  const reset = useCallback((lastSavedValue?: T) => {
    controllerRef.current.reset(lastSavedValue);
  }, []);

  return {
    status,
    schedule,
    flush,
    reset,
  };
}
