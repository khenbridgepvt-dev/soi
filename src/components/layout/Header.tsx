import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import NotificationsHost from '@/components/notifications/NotificationsHost';
import GlobalSearch from '@/components/search/GlobalSearch';

type HeaderProps = {
  appName: string;
  dashboardHref: string;
  casesBasePath?: string;
  userEmail?: string | null;
  userId?: string;
  statusToggle?: React.ReactNode;
};

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) {
    return '?';
  }
  const local = email.split('@')[0] ?? '';
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  return local.slice(0, 1).toUpperCase();
}

export default function Header({
  appName,
  dashboardHref,
  casesBasePath = '/cases',
  userEmail,
  userId,
  statusToggle,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <Link
        href={dashboardHref}
        className="shrink-0 text-sm font-semibold text-primary hover:text-primary-hover"
      >
        {appName}
      </Link>

      <div className="mx-auto w-full max-w-xl">
        <GlobalSearch casesBasePath={casesBasePath} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {statusToggle}
        <NotificationsHost userId={userId} />

        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-page text-xs font-semibold text-text-secondary"
            aria-hidden="true"
          >
            {initialsFromEmail(userEmail)}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
