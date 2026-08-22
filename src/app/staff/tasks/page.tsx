import type { Metadata } from 'next';
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

  return <MyTasksView userId={session.user.id} role={role} />;
}
