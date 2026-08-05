import type { QueryClient } from '@tanstack/react-query';
import { refetchNotificationsBackup } from '@/lib/query/notification-refetch';
import { queryKeys } from '@/lib/query/keys';

export type MutationInvalidateType =
  | 'assign'
  | 'taskStatus'
  | 'block'
  | 'unblock'
  | 'acceptLead'
  | 'rejectLead'
  | 'createLead'
  | 'deleteCase'
  | 'restoreCase'
  | 'purgeArchive'
  | 'casePatch'
  | 'dependant'
  | 'customTask'
  | 'seniorReview'
  | 'staffStatus'
  | 'timetable'
  | 'staffSettings'
  | 'applicationTypes';

export type InvalidateContext = {
  caseId?: string;
};

/** Maps mutation types to query invalidations (ticket 0032). */
export async function invalidateAfterMutation(
  queryClient: QueryClient,
  type: MutationInvalidateType,
  ctx: InvalidateContext = {},
): Promise<void> {
  const { caseId } = ctx;

  const invalidateSchedule = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });

  const invalidateTaskBoard = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.taskBoard() });

  const invalidateDashboardAdmin = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() });

  const invalidateDashboardStaff = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.staffAll });

  const invalidateCasesLists = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cases.allLists });

  const invalidateCaseDetail = () => {
    if (caseId) {
      return queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
    }
  };

  const invalidateBlocked = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.blocked.all });

  const invalidateArchive = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.archive.all });

  const invalidateTeam = () => queryClient.invalidateQueries({ queryKey: queryKeys.team() });

  const invalidateStaffLists = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.staff.allLists });

  const invalidateStaffFilterOptions = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.staff.filterOptions() });

  const invalidateApplicationTypes = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.applicationTypes() });

  const invalidateNotifications = () => {
    refetchNotificationsBackup();
    return queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
  };

  switch (type) {
    case 'assign':
      await Promise.all([
        invalidateSchedule(),
        invalidateTaskBoard(),
        invalidateDashboardAdmin(),
        invalidateDashboardStaff(),
        invalidateCaseDetail(),
        invalidateNotifications(),
      ]);
      break;
    case 'taskStatus':
      await Promise.all([
        invalidateTaskBoard(),
        invalidateDashboardAdmin(),
        invalidateDashboardStaff(),
        invalidateCaseDetail(),
      ]);
      break;
    case 'block':
    case 'unblock':
      await Promise.all([
        invalidateTaskBoard(),
        invalidateBlocked(),
        invalidateSchedule(),
        invalidateDashboardAdmin(),
        invalidateCaseDetail(),
      ]);
      break;
    case 'acceptLead':
    case 'rejectLead':
      await Promise.all([
        invalidateCasesLists(),
        invalidateDashboardAdmin(),
        invalidateTaskBoard(),
        invalidateCaseDetail(),
      ]);
      break;
    case 'createLead':
      await Promise.all([invalidateCasesLists(), invalidateDashboardAdmin()]);
      break;
    case 'deleteCase':
      await Promise.all([
        invalidateCasesLists(),
        invalidateArchive(),
        invalidateDashboardAdmin(),
        invalidateTaskBoard(),
      ]);
      break;
    case 'restoreCase':
    case 'purgeArchive':
      await Promise.all([invalidateArchive(), invalidateCasesLists()]);
      break;
    case 'casePatch':
      await Promise.all([
        invalidateCaseDetail(),
        invalidateTaskBoard(),
        invalidateCasesLists(),
      ]);
      break;
    case 'dependant':
    case 'customTask':
    case 'seniorReview':
      await invalidateCaseDetail();
      break;
    case 'staffStatus':
      await Promise.all([invalidateTeam(), invalidateDashboardAdmin()]);
      break;
    case 'timetable':
    case 'staffSettings':
      await Promise.all([
        invalidateSchedule(),
        invalidateTeam(),
        invalidateStaffLists(),
        invalidateStaffFilterOptions(),
      ]);
      break;
    case 'applicationTypes':
      await invalidateApplicationTypes();
      break;
    default:
      break;
  }
}

/** Returns query key prefixes invalidated per mutation type (for unit tests). */
export function invalidatedKeyPrefixesForMutation(
  type: MutationInvalidateType,
  ctx: InvalidateContext = {},
): string[] {
  const { caseId } = ctx;

  switch (type) {
    case 'assign':
      return ['schedule', 'taskBoard', 'dashboard', 'case', 'notifications'];
    case 'taskStatus':
      return ['taskBoard', 'dashboard', 'case'];
    case 'block':
    case 'unblock':
      return ['taskBoard', 'blocked', 'schedule', 'dashboard', 'case'];
    case 'acceptLead':
    case 'rejectLead':
      return caseId
        ? ['cases', 'dashboard', 'taskBoard', 'case']
        : ['cases', 'dashboard', 'taskBoard'];
    case 'createLead':
      return ['cases', 'dashboard'];
    case 'deleteCase':
      return ['cases', 'archive', 'dashboard', 'taskBoard'];
    case 'restoreCase':
    case 'purgeArchive':
      return ['archive', 'cases'];
    case 'casePatch':
      return ['case', 'taskBoard', 'cases'];
    case 'dependant':
    case 'customTask':
    case 'seniorReview':
      return ['case'];
    case 'staffStatus':
      return ['team', 'dashboard'];
    case 'timetable':
    case 'staffSettings':
      return ['schedule', 'team', 'staff'];
    case 'applicationTypes':
      return ['applicationTypes'];
    default:
      return [];
  }
}
