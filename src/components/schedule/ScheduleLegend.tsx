/** Inline swatch legend — design_system §3.2, tokens from the §3.1 state table. */

const ENTRIES = [
  { label: 'Available', className: 'bg-slot-available-bg border-slot-available-border' },
  { label: 'Booked', className: 'bg-slot-booked-bg border-slot-booked-border' },
  { label: 'Selected', className: 'bg-slot-selected-bg border-slot-selected-border' },
  { label: 'Conflict', className: 'bg-slot-conflict-bg border-slot-conflict-border' },
  {
    label: 'Off hours',
    className: 'bg-slot-offHours-bg border-slot-offHours-border bg-slot-off-hours',
  },
];

export default function ScheduleLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-4" aria-label="Slot legend">
      {ENTRIES.map((entry) => (
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
