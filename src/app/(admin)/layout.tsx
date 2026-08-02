import AdminAppShell from '@/components/layout/AdminAppShell';
import { ADMIN_NAV } from '@/lib/nav/admin';
import { getUser } from '@/lib/auth/session';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Task Manager';

  return (
    <AdminAppShell
      appName={appName}
      navItems={ADMIN_NAV}
      userEmail={user?.email}
      userId={user?.id}
    >
      {children}
    </AdminAppShell>
  );
}
