import {
  getTaskStatusChipLabel,
  type TaskStatusChipVariant,
} from '@/lib/tasks/firm-tasks-ui';

const CHIP_CLASSES: Record<TaskStatusChipVariant, string> = {
  not_started: 'border-border bg-page text-text-secondary',
  in_progress: 'border-[#B86E00] bg-[#FFF8E6] text-text',
  done: 'border-status-onTrack-border bg-status-onTrack-bg text-text',
  overdue: 'border-error bg-error-bg text-error',
  blocked: 'border-status-blocked-border bg-status-blocked-bg text-text-secondary',
};

type TaskStatusChipProps = {
  variant: TaskStatusChipVariant;
};

export default function TaskStatusChip({ variant }: TaskStatusChipProps) {
  return (
    <span
      role="status"
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CHIP_CLASSES[variant]}`}
    >
      {getTaskStatusChipLabel(variant)}
    </span>
  );
}
