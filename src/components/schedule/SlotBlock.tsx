/**
 * TLS slot block — design_system §3.1 / §7.2.
 * Used on S-04 and S-09 only; never on the task board (design_system §9 rule 1).
 */

export type SlotBlockState =
  | 'available'
  | 'booked'
  | 'selected'
  | 'conflict'
  | 'off_hours';

const STATE_CLASSES: Record<SlotBlockState, string> = {
  available:
    'bg-slot-available-bg border-slot-available-border text-slot-available-text hover:bg-slot-available-bgHover cursor-pointer',
  booked:
    'bg-slot-booked-bg border-slot-booked-border text-slot-booked-text cursor-pointer text-left',
  selected:
    'bg-slot-selected-bg border-slot-selected-border text-slot-selected-text cursor-pointer shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#0F2B5B]',
  conflict:
    'bg-slot-conflict-bg border-slot-conflict-border text-slot-conflict-text animate-slot-conflict-flash',
  off_hours:
    'bg-slot-offHours-bg border-slot-offHours-border bg-slot-off-hours cursor-default',
};

type SlotBlockProps = {
  state: SlotBlockState;
  children?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
};

export default function SlotBlock({
  state,
  children,
  label,
  onClick,
  style,
  className: extraClassName,
}: SlotBlockProps) {
  const className = `flex min-h-[36px] min-w-[72px] flex-col justify-center overflow-hidden rounded-md border-[1.5px] px-1.5 text-center text-sm font-semibold ${STATE_CLASSES[state]}${extraClassName ? ` ${extraClassName}` : ''}`;

  if (state === 'off_hours' || !onClick) {
    return (
      <div className={className} style={style} aria-label={label} aria-hidden={!label}>
        {children}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style} title={label}>
      {children}
    </button>
  );
}
