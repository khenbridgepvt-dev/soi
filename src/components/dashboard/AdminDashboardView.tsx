'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CreateLeadModal from '@/components/cases/CreateLeadModal';
import LeadReviewModal, { type LeadReviewTarget } from '@/components/cases/LeadReviewModal';
import MetricCard from '@/components/layout/MetricCard';
import type { AdminDashboardPayload } from '@/lib/dashboard/fetch-admin-dashboard';
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

type ApiError = {
  error?: { message?: string };
};

const ONLINE_DOT: Record<string, string> = {
  online: 'bg-[#1B7F4B]',
  break: 'bg-[#B86E00]',
  offline: 'bg-[#8B97A6]',
};

type ApplicationTypeOption = {
  id: string;
  name: string;
};

type AdminDashboardViewProps = {
  applicationTypes: ApplicationTypeOption[];
};

async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const response = await fetch('/api/dashboard/admin');
  const json = (await response.json()) as { data?: AdminDashboardPayload } & ApiError;

  if (!response.ok || !json.data) {
    throw new Error(json.error?.message ?? 'Failed to load dashboard.');
  }

  return json.data;
}

export default function AdminDashboardView({
  applicationTypes,
}: AdminDashboardViewProps) {
  const invalidate = useInvalidateAfterMutation();
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [reviewLead, setReviewLead] = useState<LeadReviewTarget | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.admin(),
    queryFn: fetchAdminDashboard,
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  const metrics = data ?? {
    active_cases: 0,
    urgent_cases: 0,
    blocked_tasks: 0,
    overdue_tasks: 0,
    pending_leads: [],
    team_status: [],
    schedule_summary: [],
  };

  function refreshDashboard() {
    void invalidate('acceptLead');
    void refetch();
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/cases?status=active">
          <MetricCard
            label="Active Cases"
            value={isLoading ? '—' : String(metrics.active_cases)}
          />
        </Link>
        <Link href="/cases?status=active&urgent=true">
          <MetricCard
            label="Urgent Cases"
            value={isLoading ? '—' : String(metrics.urgent_cases)}
          />
        </Link>
        <Link href="/task-board?filter=blocked">
          <MetricCard
            label="Blocked Tasks"
            value={isLoading ? '—' : String(metrics.blocked_tasks)}
          />
        </Link>
        <Link href="/task-board?filter=urgent">
          <MetricCard
            label="Overdue Tasks"
            value={isLoading ? '—' : String(metrics.overdue_tasks)}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">Pending leads</h2>
            <Link href="/cases?status=lead_pending" className="text-xs text-primary">
              View all →
            </Link>
          </div>
          {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
          {!isLoading && metrics.pending_leads.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-text-secondary">No pending leads</p>
              <button
                type="button"
                onClick={() => setCreateLeadOpen(true)}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
              >
                + Create Lead
              </button>
            </div>
          )}
          {!isLoading && metrics.pending_leads.length > 0 && (
            <ul className="divide-y divide-border">
              {metrics.pending_leads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{lead.client_name}</p>
                    <p className="text-xs text-text-secondary">{lead.application_type}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setReviewLead({
                        id: lead.id,
                        client_first_name: lead.client_name.split(' ')[0] ?? lead.client_name,
                        client_last_name: lead.client_name.split(' ').slice(1).join(' '),
                        application_type_name: lead.application_type,
                      })
                    }
                    className="rounded border border-border px-2 py-1 text-xs font-medium text-text hover:bg-page"
                  >
                    Review
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-text">Team status</h2>
          {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
          {!isLoading && (
            <ul className="divide-y divide-border">
              {metrics.team_status.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${ONLINE_DOT[member.online_status] ?? ONLINE_DOT.offline}`}
                      aria-hidden
                    />
                    <span className="text-sm text-text">{member.full_name}</span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {member.active_task_count} active
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-text">Today&apos;s schedule</h2>
        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {!isLoading && metrics.schedule_summary.length === 0 && (
          <p className="text-sm text-text-secondary">No staff timetables configured.</p>
        )}
        {!isLoading && metrics.schedule_summary.length > 0 && (
          <div className="space-y-3">
            {metrics.schedule_summary.map((row) => (
              <div key={row.staff_id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-text">{row.staff_name}</span>
                <div className="h-2 flex-1 rounded-full bg-page">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width:
                        row.total_hours > 0
                          ? `${Math.min(100, (row.booked_hours / row.total_hours) * 100)}%`
                          : row.booked_hours > 0
                            ? '100%'
                            : '0%',
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums text-text-secondary">
                  {row.booked_hours}h / {row.total_hours}h
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateLeadModal
        open={createLeadOpen}
        applicationTypes={applicationTypes}
        onClose={() => setCreateLeadOpen(false)}
        onCreated={() => {
          setCreateLeadOpen(false);
          void invalidate('createLead');
        }}
      />

      <LeadReviewModal
        open={reviewLead !== null}
        lead={reviewLead}
        onClose={() => setReviewLead(null)}
        onRejected={(message) => {
          setReviewLead(null);
          refreshDashboard();
        }}
        onAccepted={(message, accepted) => {
          setReviewLead(null);
          refreshDashboard();
        }}
      />
    </div>
  );
}
