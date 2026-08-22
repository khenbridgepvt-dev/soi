'use client';

import { usePathname } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import type { NavSection } from '@/lib/nav/types';

type AdminAppShellProps = {
  children: React.ReactNode;
  appName: string;
  navSections: NavSection[];
  userEmail?: string | null;
  userId?: string;
};

export default function AdminAppShell({
  children,
  appName,
  navSections,
  userEmail,
  userId,
}: AdminAppShellProps) {
  const pathname = usePathname();

  return (
    <AppShell
      appName={appName}
      dashboardHref="/schedule"
      navSections={navSections}
      activeHref={pathname}
      userEmail={userEmail}
      userId={userId}
    >
      {children}
    </AppShell>
  );
}
