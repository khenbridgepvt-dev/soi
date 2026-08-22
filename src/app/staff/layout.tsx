import AppShell from '@/components/layout/AppShell';
import QueryProvider from '@/components/providers/QueryProvider';
import { getAppDisplayName } from '@/lib/app/display-name';
import { requireSessionWithRoles } from '@/lib/auth/require-login';
import { STAFF_NAV_SECTIONS } from '@/lib/nav/staff';
import { createClient } from '@/lib/supabase/server';

export default async function StaffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionWithRole = await requireSessionWithRoles(['staff', 'senior'], {
    fallbackPath: '/staff/tasks',
    wrongRoleRedirect: '/schedule',
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
        dashboardHref="/staff/tasks"
        casesBasePath="/staff/cases"
        navSections={STAFF_NAV_SECTIONS}
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
