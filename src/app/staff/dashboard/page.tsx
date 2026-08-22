import type { Metadata } from 'next';
import StaffDashboardView from '@/components/staff/StaffDashboardView';
import { requireSessionWithRoles } from '@/lib/auth/require-login';
import { createClient } from '@/lib/supabase/server';
import { getGreeting } from '@/lib/utils/greeting';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function StaffDashboardPage() {
  const { session } = await requireSessionWithRoles(['staff', 'senior'], {
    fallbackPath: '/staff/dashboard',
    wrongRoleRedirect: '/schedule',
  });
  const supabase = await createClient();

  let fullName = 'Staff';
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile?.full_name) {
    fullName = profile.full_name;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text">
        {getGreeting()}, {fullName}
      </h1>

      <StaffDashboardView />
    </div>
  );
}
