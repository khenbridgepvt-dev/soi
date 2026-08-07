import AdminAppShell from '@/components/layout/AdminAppShell';
import QueryProvider from '@/components/providers/QueryProvider';
import { requireSessionWithRoles } from '@/lib/auth/require-login';
import { ADMIN_NAV } from '@/lib/nav/admin';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionWithRole = await requireSessionWithRoles(['admin'], {
    fallbackPath: '/dashboard',
    wrongRoleRedirect: '/staff/dashboard',
  });
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Task Manager';

  return (
    <QueryProvider>
      <AdminAppShell
        appName={appName}
        navItems={ADMIN_NAV}
        userEmail={sessionWithRole.session.user.email}
        userId={sessionWithRole.session.user.id}
      >
        {children}
      </AdminAppShell>
    </QueryProvider>
  );
}
