import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import CaseDetailView from '@/components/cases/CaseDetailView';
import { isInternalCaseId } from '@/lib/cases/internal-case';
import { getSessionWithRole } from '@/lib/auth/session';

type StaffCaseDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
};

export const metadata: Metadata = {
  title: 'Case Detail',
};

export default async function StaffCaseDetailPage({
  params,
  searchParams,
}: StaffCaseDetailPageProps) {
  const sessionWithRole = await getSessionWithRole();
  if (!sessionWithRole) {
    redirect('/login');
  }

  const { role, session } = sessionWithRole;
  if (role !== 'staff' && role !== 'senior') {
    notFound();
  }

  const { id } = await params;
  const { task } = await searchParams;

  if (isInternalCaseId(id)) {
    notFound();
  }

  return (
    <CaseDetailView
      caseId={id}
      role={role}
      userId={session.user.id}
      focusTaskId={task}
    />
  );
}
