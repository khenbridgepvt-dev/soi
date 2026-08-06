'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

type TeamMember = {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  online_status: 'online' | 'break' | 'offline';
  active_case_count: number;
  tasks_today_count: number;
  overdue_count: number;
  blocked_count: number;
};

type ApiError = {
  error?: { message?: string };
};

function statusDot(status: TeamMember['online_status']): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'break':
      return 'bg-amber-400';
    default:
      return 'bg-slate-400';
  }
}

function statusLabel(status: TeamMember['online_status']): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'break':
      return 'Break';
    default:
      return 'Offline';
  }
}

export default function TeamOverview() {
  const {
    data: team = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.team(),
    queryFn: async () => {
      const response = await fetch('/api/staff?is_active=true');
      const json = (await response.json()) as { data?: TeamMember[] } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load team overview.');
      }

      return (json.data ?? []).filter((member) => member.role !== 'admin');
    },
  });

  const error =
    isError && queryError instanceof Error
      ? queryError.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Team Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Active staff status, case counts, and workload indicators.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Loading team…</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {team.map((member) => (
            <li key={member.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${statusDot(member.online_status)}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{member.full_name}</p>
                  <p className="text-sm text-slate-600">{statusLabel(member.online_status)}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>{member.active_case_count} cases</span>
                  <span>{member.tasks_today_count} today</span>
                  {member.overdue_count > 0 && (
                    <span className="text-red-700">{member.overdue_count} overdue</span>
                  )}
                  {member.blocked_count > 0 && (
                    <span className="text-amber-700">{member.blocked_count} blocked</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
