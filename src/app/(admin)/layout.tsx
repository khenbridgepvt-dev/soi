import AppShell from '@/components/layout/AppShell';
import { getUser } from '@/lib/auth/session';

const ADMIN_NAV = [{ href: '/dashboard', label: 'Dashboard' }];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Task Manager';

  return (
    <AppShell
      appName={appName}
      dashboardHref="/dashboard"
      navItems={ADMIN_NAV}
      activeHref="/dashboard"
      userEmail={user?.email}
    >
      {children}
    </AppShell>
  );
}
