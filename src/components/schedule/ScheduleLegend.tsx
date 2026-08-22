'use client';

import { useState } from 'react';
import { SCHEDULE_COLOUR_KEY_LABEL } from '@/lib/schedule/schedule-page-ui';

/** Inline swatch legend — design_system §3.2 + §7.9 Team Task OS booked status colours. */

const SLOT_ENTRIES = [
  { label: 'Available', className: 'bg-slot-available-bg border-slot-available-border' },
  { label: 'Selected', className: 'bg-slot-selected-bg border-slot-selected-border' },
  {
    label: 'Off hours',
    className: 'bg-slot-offHours-bg border-slot-offHours-border bg-slot-off-hours',
  },
] as const;

const TASK_STATUS_ENTRIES = [
  { label: 'Not started', className: 'bg-page border-border' },
  { label: 'In progress', className: 'bg-[#FFF8E6] border-[#B86E00]' },
  { label: 'Done', className: 'bg-status-onTrack-bg border-status-onTrack-border' },
  { label: 'Overdue', className: 'bg-error-bg border-error' },
  { label: 'Blocked', className: 'bg-status-blocked-bg border-status-blocked-border' },
] as const;

type ScheduleLegendProps = {
  showTaskStatus?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

function LegendSwatches({
  entries,
  ariaLabel,
  groupLabel,
}: {
  entries: ReadonlyArray<{ label: string; className: string }>;
  ariaLabel: string;
  groupLabel?: string;
}) {
  return (
    <div>
      {groupLabel && (
        <p className="mb-1 text-xs font-medium text-text-muted">{groupLabel}</p>
      )}
      <ul className="flex flex-wrap items-center gap-4" aria-label={ariaLabel}>
        {entries.map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span
              aria-hidden="true"
              className={`inline-block h-3 w-3 rounded-sm border ${entry.className}`}
            />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendContent({ showTaskStatus = true }: { showTaskStatus?: boolean }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <LegendSwatches entries={SLOT_ENTRIES} ariaLabel="Empty slot legend" groupLabel="Empty slots" />
      {showTaskStatus && (
        <LegendSwatches
          entries={TASK_STATUS_ENTRIES}
          ariaLabel="Booked task status legend"
          groupLabel="Task status"
        />
      )}
    </div>
  );
}

export default function ScheduleLegend({
  showTaskStatus = true,
  collapsible = false,
  defaultExpanded = false,
}: ScheduleLegendProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!collapsible) {
    return <LegendContent showTaskStatus={showTaskStatus} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-[36px] items-center gap-2 text-sm font-medium text-text hover:text-primary"
        aria-expanded={expanded}
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        {SCHEDULE_COLOUR_KEY_LABEL}
      </button>
      {expanded && <LegendContent showTaskStatus={showTaskStatus} />}
    </div>
  );
}
