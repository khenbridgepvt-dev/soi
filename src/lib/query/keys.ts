/** Canonical React Query keys — single source for invalidation predicates. */

export type CasesListFilters = Record<string, string | undefined>;
export type ArchiveFilters = Record<string, string | undefined>;

export const REFETCH_INTERVAL_MS = 60_000;

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
  },
  cases: {
    allLists: ['cases', 'list'] as const,
    list: (filters: CasesListFilters) => ['cases', 'list', filters] as const,
  },
  case: (caseId: string) => ['case', caseId] as const,
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
  notifications: () => ['notifications'] as const,
};
