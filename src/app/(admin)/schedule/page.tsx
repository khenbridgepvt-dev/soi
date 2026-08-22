import type { Metadata } from 'next';
import ScheduleGridView from '@/components/schedule/ScheduleGridView';
import { requireSessionWithRoles } from '@/lib/auth/require-login';

export const metadata: Metadata = {
  title: 'Team schedule',
};

/** S-04 · Scheduling Grid */
export default async function SchedulePage() {
  const sessionWithRole = await requireSessionWithRoles(['admin'], {
    fallbackPath: '/schedule',
    wrongRoleRedirect: '/staff/tasks',
  });

  return <ScheduleGridView userId={sessionWithRole.session.user.id} />;
}
