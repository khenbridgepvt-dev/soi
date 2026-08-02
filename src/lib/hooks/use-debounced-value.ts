'use client';

import { useEffect, useRef, useState } from 'react';
import { createDebounceController, SEARCH_DEBOUNCE_MS } from '@/lib/hooks/debounce';

/** Debounces a value for search inputs (ticket 0029, ui_wireframe §3.2). */
export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const controllerRef = useRef(
    createDebounceController(delayMs, (next: T) => {
      setDebouncedValue(next);
    }),
  );

  useEffect(() => {
    controllerRef.current.schedule(value);
    return () => {
      controllerRef.current.cancel();
    };
  }, [value]);

  return debouncedValue;
}
