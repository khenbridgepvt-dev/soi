import type { Metadata } from 'next';
import AdminDashboardView from '@/components/dashboard/AdminDashboardView';
import { getUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getGreeting } from '@/lib/utils/greeting';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: applicationTypes }] = await Promise.all([
    user
      ? supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('application_types')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

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

      <AdminDashboardView applicationTypes={applicationTypes ?? []} />
    </div>
  );
}
