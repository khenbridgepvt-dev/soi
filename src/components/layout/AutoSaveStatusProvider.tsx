'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  aggregateAutoSaveStatus,
  autoSaveFooterLabel,
  type AutoSaveStatus,
} from '@/lib/utils/auto-save';

type AutoSaveStatusContextValue = {
  footerLabel: string;
  reportStatus: (id: string, status: AutoSaveStatus) => void;
  clearStatus: (id: string) => void;
};

const AutoSaveStatusContext = createContext<AutoSaveStatusContextValue | null>(null);

export function AutoSaveStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, AutoSaveStatus>>({});

  const reportStatus = useCallback((id: string, status: AutoSaveStatus) => {
    setStatuses((current) => {
      if (current[id] === status) {
        return current;
      }
      return { ...current, [id]: status };
    });
  }, []);

  const clearStatus = useCallback((id: string) => {
    setStatuses((current) => {
      if (!(id in current)) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const aggregate = useMemo(
    () => aggregateAutoSaveStatus(Object.values(statuses)),
    [statuses],
  );

  const footerLabel = useMemo(() => autoSaveFooterLabel(aggregate), [aggregate]);

  const value = useMemo(
    () => ({ footerLabel, reportStatus, clearStatus }),
    [footerLabel, reportStatus, clearStatus],
  );

  return (
    <AutoSaveStatusContext.Provider value={value}>{children}</AutoSaveStatusContext.Provider>
  );
}

export function useAutoSaveFooterLabel(): string {
  const context = useContext(AutoSaveStatusContext);
  return context?.footerLabel ?? 'Saved';
}

export function useAutoSaveStatusReporter(id: string, status: AutoSaveStatus): void {
  const context = useContext(AutoSaveStatusContext);

  useEffect(() => {
    if (!context) {
      return undefined;
    }

    context.reportStatus(id, status);
    return () => {
      context.clearStatus(id);
    };
  }, [context, id, status]);
}
