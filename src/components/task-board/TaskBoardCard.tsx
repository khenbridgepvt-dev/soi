import type { TaskBoardCard as TaskBoardCardData } from '@/lib/task-board/fetch-task-board';
import {
  TASK_BOARD_TOKEN_LABELS,
  type TaskBoardStatusToken,
} from '@/lib/task-board/card-token';
import {
  formatBoardAppointment,
  formatBoardClientName,
  formatBoardLastDate,
} from '@/lib/task-board/format-card';

type TaskBoardCardProps = {
  task: TaskBoardCardData;
  onAssign: (task: TaskBoardCardData) => void;
};

const TOKEN_SURFACE: Record<TaskBoardStatusToken, string> = {
  blocked:
    'border-l-4 border-status-blocked bg-[repeating-linear-gradient(135deg,#F5F0E6_0,#F5F0E6_8px,#EDE8DF_8px,#EDE8DF_16px)] text-text-secondary',
  overdue: 'border-l-4 border-error bg-error-bg text-text',
  urgent: 'border-l-4 border-status-urgent bg-status-urgent text-text',
  approaching: 'border-l-4 border-status-approaching bg-status-approaching text-text',
  'on-track': 'border-l-4 border-status-onTrack bg-status-onTrack text-text',
  standard: 'border border-border bg-surface text-text',
  completed: 'border-l-4 border-status-onTrack bg-status-onTrack text-text',
};

function StatusLabel({ token }: { token: TaskBoardStatusToken }) {
  const label = TASK_BOARD_TOKEN_LABELS[token];

  if (!label) {
    return null;
  }

  const labelClass =
    token === 'blocked'
      ? 'text-[#B86E00]'
      : token === 'completed'
        ? 'text-[#1B7F4B]'
      : token === 'urgent' || token === 'overdue'
        ? 'text-error'
        : 'text-[#B86E00]';

  return (
    <div className="mt-1 flex items-center gap-1">
      {token === 'blocked' && <span aria-hidden>⊘</span>}
      {token === 'overdue' && (
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-error"
          aria-hidden
        />
      )}
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}>
        {label}
      </span>
    </div>
  );
}

export default function TaskBoardCard({ task, onAssign }: TaskBoardCardProps) {
  const clientName = formatBoardClientName(
    task.client_first_name,
    task.client_last_name,
    task.dependant_count,
  );
  const appointment = formatBoardAppointment(task.appointment_date);
  const lastDate = formatBoardLastDate(task.last_date);

  return (
    <button
      type="button"
      onClick={() => onAssign(task)}
      className={`block w-full rounded-md px-3 py-2 text-left transition-shadow hover:shadow-sm ${TOKEN_SURFACE[task.token]}`}
      data-testid={`task-board-card-${task.id}`}
      data-token={task.token}
    >
      <p className="text-sm font-semibold text-text">{task.abbreviation}</p>
      <p className="text-sm text-text">{clientName}</p>
      {appointment && (
        <p className="text-xs font-medium text-text-secondary tabular-nums">{appointment}</p>
      )}
      {lastDate && (
        <p className="text-xs font-medium text-text-secondary tabular-nums">{lastDate}</p>
      )}
      {task.notes && (
        <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{task.notes}</p>
      )}
      {!task.notes && task.case_notes && (
        <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{task.case_notes}</p>
      )}
      {task.sequence === 8 && task.senior_revision_count > 0 && (
        <p className="mt-1 text-xs font-medium text-text-secondary">
          Revisions: {task.senior_revision_count}
        </p>
      )}
      <StatusLabel token={task.token} />
    </button>
  );
}
