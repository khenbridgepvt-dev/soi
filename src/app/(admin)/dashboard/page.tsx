import type { Metadata } from 'next';
import MetricCard from '@/components/layout/MetricCard';
import { getUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getGreeting } from '@/lib/utils/greeting';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const user = await getUser();
  const supabase = await createClient();

  let fullName = 'Admin';
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active Cases" />
        <MetricCard label="Urgent Cases" />
        <MetricCard label="Blocked Tasks" />
        <MetricCard label="Overdue Tasks" />
      </div>

      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-secondary">
        Pending leads, team status, and schedule widgets arrive in ticket 0024.
      </div>
    </div>
  );
}
