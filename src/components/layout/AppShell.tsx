'use client';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
  AutoSaveStatusProvider,
  useAutoSaveFooterLabel,
} from '@/components/layout/AutoSaveStatusProvider';
import OnlineStatusToggle from '@/components/staff/OnlineStatusToggle';
import type { Database } from '@/types/database';

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  children: React.ReactNode;
  appName: string;
  dashboardHref: string;
  casesBasePath?: string;
  navItems: NavItem[];
  activeHref?: string;
  userEmail?: string | null;
  userId?: string;
  onlineStatus?: Database['public']['Enums']['online_status'];
  showStatusToggle?: boolean;
};

export default function AppShell({
  children,
  appName,
  dashboardHref,
  casesBasePath = '/cases',
  navItems,
  activeHref,
  userEmail,
  userId,
  onlineStatus = 'offline',
  showStatusToggle = false,
}: AppShellProps) {
  return (
    <AutoSaveStatusProvider>
      <AppShellFrame
        appName={appName}
        dashboardHref={dashboardHref}
        casesBasePath={casesBasePath}
        navItems={navItems}
        activeHref={activeHref}
        userEmail={userEmail}
        userId={userId}
        onlineStatus={onlineStatus}
        showStatusToggle={showStatusToggle}
      >
        {children}
      </AppShellFrame>
    </AutoSaveStatusProvider>
  );
}

function AppShellFrame({
  children,
  appName,
  dashboardHref,
  casesBasePath = '/cases',
  navItems,
  activeHref,
  userEmail,
  userId,
  onlineStatus = 'offline',
  showStatusToggle = false,
}: AppShellProps) {
  const footerLabel = useAutoSaveFooterLabel();

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header
        appName={appName}
        dashboardHref={dashboardHref}
        casesBasePath={casesBasePath}
        userEmail={userEmail}
        userId={userId}
        statusToggle={
          showStatusToggle && userId ? (
            <OnlineStatusToggle userId={userId} initialStatus={onlineStatus} />
          ) : null
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} activeHref={activeHref} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      <footer
        className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-text-muted"
        aria-label="Status bar"
      >
        <span>{footerLabel}</span>
        <span>Online</span>
      </footer>
    </div>
  );
}
