import { queryKeys } from '@/lib/query/keys';

export type TaskRealtimeRecord = {
  id?: string;
  status?: string;
  assigned_to?: string | null;
  case_id?: string;
  is_overdue?: boolean;
};

export type TaskChange = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  record: TaskRealtimeRecord;
  oldRecord?: TaskRealtimeRecord;
};

type TaskViewerRole = 'admin' | 'staff' | 'senior';

const RELEVANT_FIELDS = ['status', 'assigned_to', 'is_overdue'] as const;

function involvesAssignee(change: TaskChange, userId: string): boolean {
  return (
    change.record.assigned_to === userId || change.oldRecord?.assigned_to === userId
  );
}

function hasRelevantFieldChange(change: TaskChange): boolean {
  if (change.eventType !== 'UPDATE' || !change.oldRecord) {
    return true;
  }

  return RELEVANT_FIELDS.some(
    (field) => change.record[field] !== change.oldRecord?.[field],
  );
}

/** Returns true when a Realtime payload should invalidate schedule / My tasks views. */
export function shouldInvalidateViewsForTaskChange(
  change: TaskChange,
  options: { userId: string; role: TaskViewerRole },
): boolean {
  if (!hasRelevantFieldChange(change)) {
    return false;
  }

  if (options.role === 'admin') {
    return true;
  }

  return involvesAssignee(change, options.userId);
}

/** Query key prefixes invalidated on relevant task changes (0097). */
export function taskRealtimeQueryKeysToInvalidate() {
  return [
    queryKeys.schedule.all,
    queryKeys.dashboard.staffAll,
    queryKeys.staffTasks.dashboard(),
    queryKeys.staffTasks.history(),
    queryKeys.taskBoard(),
    queryKeys.reminders.all,
  ] as const;
}
