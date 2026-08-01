import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import LeadDetailActionsClient from '@/components/cases/LeadDetailActionsClient';
import { DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/session';

type CaseDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ accepted?: string }>;
};

export default async function CaseDetailPage({
  params,
  searchParams,
}: CaseDetailPageProps) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const { accepted } = await searchParams;
  const supabase = await createClient();

  const { data: caseRow, error } = await supabase
    .from('cases')
    .select(
      `
        id,
        reference,
        client_first_name,
        client_last_name,
        status,
        notes,
        created_at,
        application_types ( name, code )
      `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !caseRow) {
    notFound();
  }

  const applicationType = Array.isArray(caseRow.application_types)
    ? caseRow.application_types[0]
    : caseRow.application_types;

  const isLead = caseRow.status === 'lead_pending';
  const isRejected = caseRow.status === 'rejected';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/cases" className="text-sm text-[#0F2B5B] hover:underline">
            ← Back to Cases
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {caseRow.client_first_name} {caseRow.client_last_name}
          </h1>
          <p className="text-sm text-slate-600">
            {applicationType?.name ?? '—'} · {caseRow.reference ?? 'No reference yet'}
          </p>
        </div>
        <span
          className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ${
            caseRow.status === 'lead_pending'
              ? 'bg-[#ECEFF3] text-[#5C6B7A]'
              : caseRow.status === 'active'
                ? 'bg-[#E8F4FD] text-[#0F2B5B]'
                : caseRow.status === 'rejected'
                  ? 'bg-[#FEE2E2] text-[#C41E24]'
                  : 'bg-[#E8F5EC] text-[#1B7F4B]'
          }`}
        >
          {caseRow.status.replace('_', ' ')}
        </span>
      </div>

      {accepted === '1' && caseRow.status === 'active' && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Case {caseRow.reference} created with {DEFAULT_TASK_COUNT} tasks.
        </div>
      )}

      {isRejected && (
        <div className="rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Rejected — read only
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p>
          <span className="font-medium">Created:</span>{' '}
          {new Date(caseRow.created_at).toLocaleString()}
        </p>
        {caseRow.notes && (
          <p className="mt-2">
            <span className="font-medium">Notes:</span> {caseRow.notes}
          </p>
        )}
      </div>

      {isLead && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm text-slate-600">
            Review this lead to accept or reject it.
          </p>
          <LeadDetailActionsClient
            lead={{
              id: caseRow.id,
              client_first_name: caseRow.client_first_name,
              client_last_name: caseRow.client_last_name,
              application_type_name: applicationType?.name ?? '—',
              application_type_code: applicationType?.code ?? null,
              notes: caseRow.notes,
            }}
          />
        </div>
      )}
    </div>
  );
}
