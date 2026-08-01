import { notFound, redirect } from 'next/navigation';
import CaseDetailView from '@/components/cases/CaseDetailView';
import { getSessionWithRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

type CaseDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ accepted?: string }>;
};

export default async function CaseDetailPage({
  params,
  searchParams,
}: CaseDetailPageProps) {
  const sessionWithRole = await getSessionWithRole();
  if (!sessionWithRole) {
    redirect('/login');
  }

  const { id } = await params;
  const { accepted } = await searchParams;
  const { role, session } = sessionWithRole;

  if (role !== 'admin') {
    notFound();
  }

  const supabase = await createClient();
  const { data: applicationTypes } = await supabase
    .from('application_types')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <CaseDetailView
      caseId={id}
      role={role}
      userId={session.user.id}
      accepted={accepted === '1'}
      applicationTypes={applicationTypes ?? []}
    />
  );
}
