import type { Metadata } from 'next';
import MetricCard from '@/components/layout/MetricCard';
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Today's Tasks" />
        <MetricCard label="Overdue" />
        <MetricCard label="Blocked" />
        <MetricCard label="Due This Week" />
      </div>

      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-text">Your priority list</h2>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Next action
          </p>
          <div className="mt-3 rounded-md border border-dashed border-border bg-page p-6 text-center text-sm text-text-secondary">
            No tasks scheduled. Priority list data arrives in ticket 0025.
          </div>
        </div>
      </section>
    </div>
  );
}
