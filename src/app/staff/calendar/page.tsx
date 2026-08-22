import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import StaffDayCalendarView from '@/components/staff/StaffDayCalendarView';
import { getSessionWithRole } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'My calendar',
};

export default async function StaffCalendarPage() {
  const sessionWithRole = await getSessionWithRole();
  if (!sessionWithRole) {
    redirect('/login');
  }

  const { role, session } = sessionWithRole;
  if (role !== 'staff' && role !== 'senior') {
    redirect('/schedule');
  }

  return <StaffDayCalendarView staffId={session.user.id} role={role} />;
}
