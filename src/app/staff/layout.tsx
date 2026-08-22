import AppShell from '@/components/layout/AppShell';
import QueryProvider from '@/components/providers/QueryProvider';
import { getAppDisplayName } from '@/lib/app/display-name';
import { requireSessionWithRoles } from '@/lib/auth/require-login';
import { createClient } from '@/lib/supabase/server';

const STAFF_NAV = [
  { href: '/staff/dashboard', label: 'Dashboard' },
  { href: '/staff/calendar', label: 'My Calendar' },
  { href: '/staff/reminders', label: 'Reminders' },
  { href: '/staff/profile', label: 'My Profile' },
];

export default async function StaffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionWithRole = await requireSessionWithRoles(['staff', 'senior'], {
    fallbackPath: '/staff/dashboard',
    wrongRoleRedirect: '/dashboard',
  });
  const appName = getAppDisplayName();
  const supabase = await createClient();

  let onlineStatus: 'online' | 'break' | 'offline' = 'offline';
  const { data: profile } = await supabase
    .from('profiles')
    .select('online_status')
    .eq('id', sessionWithRole.session.user.id)
    .maybeSingle();

  if (profile?.online_status) {
    onlineStatus = profile.online_status;
  }

  return (
    <QueryProvider>
      <AppShell
        appName={appName}
        dashboardHref="/staff/dashboard"
        casesBasePath="/staff/cases"
        navSections={[{ items: STAFF_NAV }]}
        userEmail={sessionWithRole.session.user.email}
        userId={sessionWithRole.session.user.id}
        onlineStatus={onlineStatus}
        showStatusToggle
      >
        {children}
      </AppShell>
    </QueryProvider>
  );
}
