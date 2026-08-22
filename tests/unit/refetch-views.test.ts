import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import {
  refetchActiveScheduleQueries,
  refetchActiveTaskViewQueries,
} from '@/lib/query/refetch-views';
import { queryKeys } from '@/lib/query/keys';

describe('refetch-views (0109)', () => {
  it('refetchActiveScheduleQueries targets active schedule queries', async () => {
    const queryClient = new QueryClient();
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue();

    await refetchActiveScheduleQueries(queryClient);

    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.schedule.all,
      type: 'active',
    });
  });

  it('refetchActiveTaskViewQueries targets active task/status views', async () => {
    const queryClient = new QueryClient();
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue();

    await refetchActiveTaskViewQueries(queryClient);

    expect(refetchQueries).toHaveBeenCalledTimes(6);
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.schedule.all,
      type: 'active',
    });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard.staffAll,
      type: 'active',
    });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.staffTasks.dashboard(),
      type: 'active',
    });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.taskBoard(),
      type: 'active',
    });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.reminders.all,
      type: 'active',
    });
  });
});
