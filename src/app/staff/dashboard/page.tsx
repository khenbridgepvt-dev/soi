import type { Metadata } from 'next';
import StaffDashboardView from '@/components/staff/StaffDashboardView';
import { getUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getGreeting } from '@/lib/utils/greeting';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function StaffDashboardPage() {
  const user = await getUser();
  const supabase = await createClient();

  let fullName = 'Staff';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.full_name) {
      fullName = profile.full_name;
    }
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
