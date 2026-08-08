import AdminAppShell from '@/components/layout/AdminAppShell';
import QueryProvider from '@/components/providers/QueryProvider';
import { getAppDisplayName } from '@/lib/app/display-name';
import { requireSessionWithRoles } from '@/lib/auth/require-login';
import { ADMIN_NAV_SECTIONS } from '@/lib/nav/admin';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionWithRole = await requireSessionWithRoles(['admin'], {
    fallbackPath: '/dashboard',
    wrongRoleRedirect: '/staff/dashboard',
  });

  return (
    <QueryProvider>
      <AdminAppShell
        appName={getAppDisplayName()}
        navSections={ADMIN_NAV_SECTIONS}
        userEmail={sessionWithRole.session.user.email}
        userId={sessionWithRole.session.user.id}
      >
        {children}
      </AdminAppShell>
    </QueryProvider>
  );
}
