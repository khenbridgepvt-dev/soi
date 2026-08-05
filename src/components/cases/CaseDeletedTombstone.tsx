import Link from 'next/link';
import type { CaseTombstone } from '@/lib/cases/fetch-case-tombstone';

type CaseDeletedTombstoneProps = {
  tombstone: CaseTombstone;
};

function formatDeletedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CaseDeletedTombstone({ tombstone }: CaseDeletedTombstoneProps) {
  const clientName = `${tombstone.client_first_name} ${tombstone.client_last_name}`.trim();

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-surface px-6 py-10 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Case deleted</p>
      <h1 className="mt-2 text-lg font-semibold text-text">
        {tombstone.reference ?? 'No reference'}
      </h1>
      {clientName && <p className="mt-1 text-sm text-text-secondary">{clientName}</p>}

      <dl className="mt-6 space-y-3 text-left text-sm">
        <div>
          <dt className="text-text-muted">Deleted</dt>
          <dd className="font-medium text-text">{formatDeletedAt(tombstone.deleted_at)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Deleted by</dt>
          <dd className="font-medium text-text">
            {tombstone.deleted_by_name ?? 'Unknown'}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/cases"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-page"
        >
          ← Back to Cases
        </Link>
        <Link
          href="/archive"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          View Archive
        </Link>
      </div>
    </div>
  );
}
