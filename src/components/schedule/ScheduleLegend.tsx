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
  { label: 'Completed', className: 'bg-status-onTrack-bg border-status-onTrack-border' },
  { label: 'Overdue', className: 'bg-error-bg border-error' },
  { label: 'Blocked', className: 'bg-status-blocked-bg border-status-blocked-border' },
] as const;

type ScheduleLegendProps = {
  showTaskStatus?: boolean;
};

function LegendSwatches({
  entries,
  ariaLabel,
}: {
  entries: ReadonlyArray<{ label: string; className: string }>;
  ariaLabel: string;
}) {
  return (
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
  );
}

export default function ScheduleLegend({ showTaskStatus = true }: ScheduleLegendProps) {
  return (
    <div className="flex flex-col gap-2">
      <LegendSwatches entries={SLOT_ENTRIES} ariaLabel="Empty slot legend" />
      {showTaskStatus && (
        <LegendSwatches entries={TASK_STATUS_ENTRIES} ariaLabel="Booked task status legend" />
      )}
    </div>
  );
}
