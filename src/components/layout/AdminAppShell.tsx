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
};

export default function AdminAppShell({
  children,
  appName,
  navItems,
  userEmail,
}: AdminAppShellProps) {
  const pathname = usePathname();

  return (
    <AppShell
      appName={appName}
      dashboardHref="/dashboard"
      navItems={navItems}
      activeHref={pathname}
      userEmail={userEmail}
    >
      {children}
    </AppShell>
  );
}
