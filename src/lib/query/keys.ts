/** Canonical React Query keys — single source for invalidation predicates. */

export type CasesListFilters = Record<string, string | undefined>;
export type ArchiveFilters = Record<string, string | undefined>;

export const REFETCH_INTERVAL_MS = 60_000;

/** Pilot fallback poll on Team Schedule when Realtime is slow/disconnected (0109). */
export const SCHEDULE_REFETCH_INTERVAL_MS = 15_000;

export const queryKeys = {
  schedule: {
    all: ['schedule'] as const,
    day: (date: string) => ['schedule', date] as const,
    staff: (staffId: string, date: string) => ['schedule', 'staff', staffId, date] as const,
  },
  taskBoard: () => ['taskBoard'] as const,
  dashboard: {
    admin: () => ['dashboard', 'admin'] as const,
    staff: (view: string) => ['dashboard', 'staff', view] as const,
    staffAll: ['dashboard', 'staff'] as const,
    staffHistory: () => ['dashboard', 'staff', 'history'] as const,
  },
  cases: {
    allLists: ['cases', 'list'] as const,
    list: (filters: CasesListFilters) => ['cases', 'list', filters] as const,
  },
  case: (caseId: string) => ['case', caseId] as const,
  caseTombstone: (caseId: string) => ['case', caseId, 'tombstone'] as const,
  blocked: {
    all: ['blocked'] as const,
    list: (staffFilter?: string) =>
      staffFilter ? (['blocked', staffFilter] as const) : (['blocked'] as const),
  },
  archive: {
    all: ['archive'] as const,
    list: (filters: ArchiveFilters) => ['archive', filters] as const,
  },
  team: () => ['team'] as const,
  staff: {
    allLists: ['staff', 'list'] as const,
    list: (filter: string) => ['staff', 'list', filter] as const,
    filterOptions: () => ['staff', 'filterOptions'] as const,
  },
  applicationTypes: () => ['applicationTypes'] as const,
  coveringLetterhead: () => ['coveringLetterhead'] as const,
  notifications: () => ['notifications'] as const,
  reminders: {
    all: ['reminders'] as const,
    list: (filter: string) => ['reminders', filter] as const,
  },
  staffTasks: {
    dashboard: () => ['staffTasks', 'dashboard'] as const,
    history: () => ['staffTasks', 'history'] as const,
  },
};
