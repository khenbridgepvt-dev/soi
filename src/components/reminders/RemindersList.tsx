'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { INTERNAL_CASE_REFERENCE } from '@/lib/cases/internal-case';
import { queryKeys } from '@/lib/query/keys';
import {
  operationalColourLabel,
  taskColourPillClasses,
} from '@/lib/tasks/task-colour';
import type { ReminderColour } from '@/lib/tasks/task-reminder-state';
import { formatLongDate } from '@/lib/utils/dates';

export type ReminderFilterChip = 'reminder_due' | 'at_risk' | 'overdue';

type ReminderRow = {
  id: string;
  name: string;
  abbreviation: string;
  reminder_note: string | null;
  reminder_date: string | null;
  deadline_date: string | null;
  remind_days_before: number | null;
  status: string;
  is_overdue: boolean;
  case_id: string;
  case_reference: string | null;
  client_first_name: string;
  client_last_name: string;
  case_is_urgent: boolean;
  assigned_to: string | null;
  state: {
    reminder_due: boolean;
    deadline_approaching: boolean;
    overdue: boolean;
    at_risk: boolean;
    colour: ReminderColour;
  };
};

type StaffOption = {
  id: string;
  full_name: string;
};

type ApiError = {
  error?: { message?: string };
};

type RemindersListProps = {
  caseLinkBase: '/cases' | '/staff/cases';
  showAssignedStaff?: boolean;
};

const FILTER_CHIPS: Array<{ id: ReminderFilterChip; label: string }> = [
  { id: 'at_risk', label: 'At risk' },
  { id: 'reminder_due', label: 'Reminder due' },
  { id: 'overdue', label: 'Overdue' },
];

function formatReminderDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  return formatLongDate(value);
}

export function caseReferenceLabel(reference: string | null): string {
  if (reference === INTERNAL_CASE_REFERENCE) {
    return 'Firm task';
  }

  return reference ?? 'No reference';
}

function clientName(row: ReminderRow): string {
  return `${row.client_first_name} ${row.client_last_name}`.trim();
}

function colourLabel(colour: ReminderColour): string {
  return operationalColourLabel(colour);
}

export default function RemindersList({
  caseLinkBase,
  showAssignedStaff = false,
}: RemindersListProps) {
  const [filter, setFilter] = useState<ReminderFilterChip>('at_risk');

  const { data: staffOptions = [] } = useQuery({
    queryKey: queryKeys.staff.filterOptions(),
    enabled: showAssignedStaff,
    queryFn: async () => {
      const response = await fetch('/api/staff?is_active=true');
      const json = (await response.json()) as { data?: StaffOption[] };
      return (json.data ?? []).filter((member) => member.id && member.full_name);
    },
  });

  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of staffOptions) {
      map.set(member.id, member.full_name);
    }
    return map;
  }, [staffOptions]);

  const {
    data: rows = [],
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.reminders.list(filter),
    queryFn: async () => {
      const response = await fetch(`/api/reminders?filter=${filter}`);
      const json = (await response.json()) as { data?: ReminderRow[] } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load reminders.');
      }

      return json.data ?? [];
    },
  });

  const loadError =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Reminders</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tasks with due reminders, approaching deadlines, or overdue work.
          </p>
        </div>
        <p className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary">
          {rows.length} task{rows.length === 1 ? '' : 's'}
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {loadError}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === chip.id
                ? 'bg-primary text-white'
                : 'bg-page text-text-secondary hover:bg-border'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-page" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          No reminders due — you&apos;re up to date.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-page text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Reminder</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                {showAssignedStaff && <th className="px-4 py-3">Assigned</th>}
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const caseHref = `${caseLinkBase}/${row.case_id}`;

                return (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">
                        <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                          {row.abbreviation}
                        </span>
                        {row.name}
                      </p>
                      {row.reminder_note && (
                        <p className="mt-1 text-xs text-text-muted" title={row.reminder_note}>
                          {row.reminder_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={caseHref} className="font-medium text-text hover:underline">
                        {caseReferenceLabel(row.case_reference)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text">{clientName(row)}</td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">
                      {formatReminderDate(row.reminder_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">
                      {formatReminderDate(row.deadline_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${taskColourPillClasses(row.state.colour)}`}
                      >
                        {colourLabel(row.state.colour)}
                      </span>
                    </td>
                    {showAssignedStaff && (
                      <td className="px-4 py-3 text-text">
                        {row.assigned_to
                          ? (staffNameById.get(row.assigned_to) ?? '—')
                          : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link
                        href={caseHref}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-page"
                      >
                        Open case
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
