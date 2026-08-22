import Link from 'next/link';
import type { TeamWorkloadSummary } from '@/lib/schedule/team-workload-summary';

type TeamWorkloadStripProps = {
  summaries: TeamWorkloadSummary[];
};

function CountPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'yellow' | 'green' | 'red';
}) {
  const toneClass =
    tone === 'yellow'
      ? 'bg-[#FFF8E6] text-[#B86E00]'
      : tone === 'green'
        ? 'bg-status-onTrack-bg text-text'
        : 'bg-error-bg text-error';

  return (
    <span
      className={`inline-flex min-w-[2.5rem] items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${toneClass}`}
      title={label}
    >
      {value}
    </span>
  );
}

export default function TeamWorkloadStrip({ summaries }: TeamWorkloadStripProps) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 rounded-md border border-border bg-surface px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Team workload
        </p>
        <Link
          href="/team"
          className="text-xs font-medium text-primary hover:text-primary-hover"
        >
          Team overview →
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {summaries.map((summary) => (
          <div
            key={summary.staffId}
            className="min-w-[9.5rem] shrink-0 rounded-md border border-border bg-page px-3 py-2"
          >
            <p className="truncate text-sm font-semibold text-text">{summary.staffName}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <CountPill label="In progress" value={summary.inProgress} tone="yellow" />
              <CountPill label="Done today" value={summary.doneToday} tone="green" />
              <CountPill label="Overdue" value={summary.overdue} tone="red" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
