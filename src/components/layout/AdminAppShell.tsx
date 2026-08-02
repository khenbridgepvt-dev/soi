'use client';

import { usePathname } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

type NavItem = {
  href: string;
  label: string;
};

type AdminAppShellProps = {
  children: React.ReactNode;
  appName: string;
  navItems: NavItem[];
  userEmail?: string | null;
  userId?: string;
};

export default function AdminAppShell({
  children,
  appName,
  navItems,
  userEmail,
  userId,
}: AdminAppShellProps) {
  const pathname = usePathname();

  return (
    <AppShell
      appName={appName}
      dashboardHref="/dashboard"
      navItems={navItems}
      activeHref={pathname}
      userEmail={userEmail}
      userId={userId}
    >
      {children}
    </AppShell>
  );
}
