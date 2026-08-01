import { redirect } from 'next/navigation';
import { getSessionWithRole } from '@/lib/auth/session';
import { getDashboardPathForRole } from '@/lib/auth/routes';

export default async function HomePage() {
  const sessionWithRole = await getSessionWithRole();

  if (sessionWithRole) {
    redirect(getDashboardPathForRole(sessionWithRole.role));
  }

  redirect('/login');
}
