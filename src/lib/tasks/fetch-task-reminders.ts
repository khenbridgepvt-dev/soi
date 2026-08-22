import type { SupabaseClient } from '@supabase/supabase-js';

import {
  computeTaskReminderState,
  isAtRisk,
  isDeadlineApproaching,
  isReminderDue,
  isTaskOverdueForReminders,
  todayUTCISODate,
  type TaskReminderFields,
  type TaskReminderStateFlags,
} from '@/lib/tasks/task-reminder-state';
import type { Database } from '@/types/database';

export type ReminderListFilter =
  | 'all'
  | 'reminder_due'
  | 'deadline_approaching'
  | 'overdue'
  | 'at_risk';

export type TaskReminderListItem = TaskReminderFields & {
  id: string;
  name: string;
  abbreviation: string;
  reminder_note: string | null;
  case_id: string;
  case_reference: string | null;
  client_first_name: string;
  client_last_name: string;
  case_is_urgent: boolean;
  assigned_to: string | null;
  state: TaskReminderStateFlags;
};

type FetchTaskRemindersOptions = {
  filter?: ReminderListFilter;
  today?: string;
};

function parseFilter(value: string | null): ReminderListFilter {
  if (
    value === 'reminder_due' ||
    value === 'deadline_approaching' ||
    value === 'overdue' ||
    value === 'at_risk'
  ) {
    return value;
  }

  return 'all';
}

export function parseReminderListFilter(value: string | null): ReminderListFilter {
  return parseFilter(value);
}

function matchesFilter(
  state: TaskReminderStateFlags,
  filter: ReminderListFilter,
): boolean {
  switch (filter) {
    case 'reminder_due':
      return state.reminder_due;
    case 'deadline_approaching':
      return state.deadline_approaching;
    case 'overdue':
      return state.overdue;
    case 'at_risk':
      return state.at_risk;
    case 'all':
    default:
      return state.at_risk;
  }
}

export async function fetchTaskReminders(
  client: SupabaseClient<Database>,
  options: FetchTaskRemindersOptions = {},
): Promise<TaskReminderListItem[]> {
  const today = options.today ?? todayUTCISODate();
  const filter = options.filter ?? 'all';

  const { data, error } = await client
    .from('tasks')
    .select(
      `
      id,
      name,
      abbreviation,
      status,
      assigned_to,
      reminder_date,
      reminder_note,
      deadline_date,
      remind_days_before,
      is_overdue,
      cases!inner (
        id,
        reference,
        client_first_name,
        client_last_name,
        is_urgent,
        status
      )
    `,
    )
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .eq('cases.status', 'active');

  if (error) {
    throw error;
  }

  const items: TaskReminderListItem[] = [];

  for (const row of data ?? []) {
    const caseRow = row.cases;
    if (!caseRow) {
      continue;
    }

    const task: TaskReminderFields = {
      reminder_date: row.reminder_date,
      deadline_date: row.deadline_date,
      remind_days_before: row.remind_days_before,
      status: row.status,
      is_overdue: row.is_overdue,
    };

    const state = computeTaskReminderState(task, caseRow.is_urgent, today);

    if (!matchesFilter(state, filter)) {
      continue;
    }

    items.push({
      ...task,
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      reminder_note: row.reminder_note,
      case_id: caseRow.id,
      case_reference: caseRow.reference,
      client_first_name: caseRow.client_first_name,
      client_last_name: caseRow.client_last_name,
      case_is_urgent: caseRow.is_urgent,
      assigned_to: row.assigned_to,
      state,
    });
  }

  items.sort((a, b) => {
    const aDate = a.reminder_date ?? a.deadline_date ?? '9999-12-31';
    const bDate = b.reminder_date ?? b.deadline_date ?? '9999-12-31';
    return aDate.localeCompare(bDate);
  });

  return items;
}

export const reminderStateHelpers = {
  isReminderDue,
  isDeadlineApproaching,
  isTaskOverdueForReminders,
  isAtRisk,
};
