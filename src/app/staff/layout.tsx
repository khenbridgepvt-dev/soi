import AppShell from '@/components/layout/AppShell';
import { getUser } from '@/lib/auth/session';

const STAFF_NAV = [{ href: '/staff/dashboard', label: 'Dashboard' }];

export default async function StaffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Task Manager';

  return (
    <AppShell
      appName={appName}
      dashboardHref="/staff/dashboard"
      navItems={STAFF_NAV}
      activeHref="/staff/dashboard"
      userEmail={user?.email}
    >
      {children}
    </AppShell>
  );
}
