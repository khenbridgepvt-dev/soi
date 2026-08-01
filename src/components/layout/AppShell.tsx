import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  children: React.ReactNode;
  appName: string;
  dashboardHref: string;
  navItems: NavItem[];
  activeHref: string;
  userEmail?: string | null;
};

export default function AppShell({
  children,
  appName,
  dashboardHref,
  navItems,
  activeHref,
  userEmail,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header appName={appName} dashboardHref={dashboardHref} userEmail={userEmail} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} activeHref={activeHref} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      <footer
        className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-text-muted"
        aria-label="Status bar"
      >
        <span>Saved</span>
        <span>Online</span>
      </footer>
    </div>
  );
}
