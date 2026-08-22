import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

/** Immediately refetch mounted schedule queries (admin grid, staff day calendar). */
export function refetchActiveScheduleQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.refetchQueries({
    queryKey: queryKeys.schedule.all,
    type: 'active',
  });
}

/** Immediately refetch mounted task/status views after Realtime or staff actions. */
export async function refetchActiveTaskViewQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: queryKeys.schedule.all, type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.dashboard.staffAll, type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.staffTasks.dashboard(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.staffTasks.history(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.taskBoard(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: queryKeys.reminders.all, type: 'active' }),
  ]);
}
