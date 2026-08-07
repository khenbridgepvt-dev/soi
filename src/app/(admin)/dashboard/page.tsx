import type { Metadata } from 'next';
import AdminDashboardView from '@/components/dashboard/AdminDashboardView';
import { requireSessionWithRoles } from '@/lib/auth/require-login';
import { createClient } from '@/lib/supabase/server';
import { getGreeting } from '@/lib/utils/greeting';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const { session } = await requireSessionWithRoles(['admin'], {
    fallbackPath: '/dashboard',
    wrongRoleRedirect: '/staff/dashboard',
  });
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  let fullName = 'Admin';
  if (profile?.full_name) {
    fullName = profile.full_name;
  }

  const now = new Date();
  const dateTime = now.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold text-text">
          {getGreeting()}, {fullName}
        </h1>
        <p className="text-sm text-text-secondary tabular-nums">{dateTime}</p>
      </div>

      <AdminDashboardView />
    </div>
  );
}
