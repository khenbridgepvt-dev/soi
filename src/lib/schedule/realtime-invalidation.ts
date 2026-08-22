export type TaskAssignmentRealtimeRecord = {
  date?: string;
  staff_id?: string;
};

export type TaskAssignmentChange = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  record: TaskAssignmentRealtimeRecord;
  oldRecord?: TaskAssignmentRealtimeRecord;
};

function relevantDates(change: TaskAssignmentChange): string[] {
  const dates = new Set<string>();

  if (change.record.date) {
    dates.add(change.record.date);
  }

  if (change.oldRecord?.date) {
    dates.add(change.oldRecord.date);
  }

  return [...dates];
}

function involvesStaff(change: TaskAssignmentChange, staffId: string): boolean {
  return (
    change.record.staff_id === staffId || change.oldRecord?.staff_id === staffId
  );
}

/** Returns true when a Realtime payload should invalidate the viewed schedule day. */
export function shouldInvalidateScheduleForAssignmentChange(
  change: TaskAssignmentChange,
  options: {
    viewedDate: string;
    staffId?: string;
  },
): boolean {
  if (!relevantDates(change).includes(options.viewedDate)) {
    return false;
  }

  if (options.staffId) {
    return involvesStaff(change, options.staffId);
  }

  return true;
}

export function scheduleQueryKeysToInvalidate(viewedDate: string, staffId?: string) {
  const keys: Array<readonly string[]> = [['schedule'], ['schedule', viewedDate]];

  if (staffId) {
    keys.push(['schedule', 'staff', staffId, viewedDate]);
  }

  return keys;
}
