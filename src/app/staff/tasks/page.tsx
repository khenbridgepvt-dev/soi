import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import MyTasksView from '@/components/staff/MyTasksView';
import { requireSessionWithRoles } from '@/lib/auth/require-login';

export const metadata: Metadata = {
  title: 'My Tasks',
};

export default async function StaffTasksPage() {
  const { role, session } = await requireSessionWithRoles(['staff', 'senior'], {
    fallbackPath: '/staff/tasks',
    wrongRoleRedirect: '/schedule',
  });

  if (role !== 'staff' && role !== 'senior') {
    redirect('/schedule');
  }

  return <MyTasksView userId={session.user.id} role={role} />;
}
