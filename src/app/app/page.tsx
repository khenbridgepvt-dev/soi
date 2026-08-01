import { redirect } from 'next/navigation';
import { getSessionWithRole } from '@/lib/auth/session';
import { getDashboardPathForRole } from '@/lib/auth/routes';

export default async function AppPlaceholderPage() {
  const sessionWithRole = await getSessionWithRole();

  if (!sessionWithRole) {
    redirect('/login');
  }

  redirect(getDashboardPathForRole(sessionWithRole.role));
}
