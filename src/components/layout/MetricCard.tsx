type MetricCardProps = {
  label: string;
  value?: string;
};

export default function MetricCard({ label, value = '—' }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-tight text-text tabular-nums">
        {value}
      </p>
    </div>
  );
}
