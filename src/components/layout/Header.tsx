import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

type HeaderProps = {
  appName: string;
  dashboardHref: string;
  userEmail?: string | null;
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

export default function Header({ appName, dashboardHref, userEmail }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <Link
        href={dashboardHref}
        className="shrink-0 text-sm font-semibold text-primary hover:text-primary-hover"
      >
        {appName}
      </Link>

      <div className="mx-auto w-full max-w-xl">
        <input
          type="search"
          disabled
          readOnly
          placeholder="Search by reference, client name, or staff..."
          aria-label="Global search"
          className="w-full rounded-md border border-border bg-page px-3 py-2 text-sm text-text-muted"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          disabled
          aria-label="Notifications"
          className="relative rounded-md p-2 text-text-secondary opacity-60"
        >
          <span aria-hidden="true">🔔</span>
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white"
          >
            0
          </span>
        </button>

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
