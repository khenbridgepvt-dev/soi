import type { Database } from '@/types/database';

export type TaskStatus = Database['public']['Enums']['task_status'];
export type SeniorReviewOutcome = Database['public']['Enums']['senior_review_outcome'];

export type CaseTaskForPrereq = {
  sequence: number;
  name: string;
  abbreviation: string;
  status: TaskStatus;
  is_custom: boolean;
  senior_approval?: SeniorReviewOutcome | null;
};

export type PrerequisiteFailure = {
  ok: false;
  message: string;
  details: Array<{ field: string; message: string }>;
};

export type PrerequisiteSuccess = { ok: true };

const TASK_10_REQUIRED_SEQUENCES = [1, 2, 9] as const;

const TASK_10_MESSAGE =
  'Tasks 1 (CCL), 2 (LOA), and 9 (Disclaimer) must be completed first.';

const TASK_9_MESSAGE = 'Task 8 must be approved by a senior reviewer.';

/** ADR-0002: custom tasks never join prerequisite gates. */
export function checkTaskPrerequisites(
  task: { sequence: number; is_custom: boolean },
  caseTasks: CaseTaskForPrereq[],
): PrerequisiteSuccess | PrerequisiteFailure {
  if (task.is_custom) {
    return { ok: true };
  }

  const bySequence = new Map(caseTasks.map((row) => [row.sequence, row]));

  if (task.sequence === 9) {
    const task8 = bySequence.get(8);
    if (!task8 || task8.senior_approval !== 'approved') {
      return {
        ok: false,
        message: TASK_9_MESSAGE,
        details: [
          {
            field: 'task_8',
            message: 'Task 8 (Review by Senior) must have senior_approval = approved.',
          },
        ],
      };
    }
  }

  if (task.sequence === 10) {
    const outstanding = TASK_10_REQUIRED_SEQUENCES.filter((sequence) => {
      const row = bySequence.get(sequence);
      return !row || row.status !== 'completed';
    });

    if (outstanding.length > 0) {
      return {
        ok: false,
        message: TASK_10_MESSAGE,
        details: outstanding.map((sequence) => {
          const row = bySequence.get(sequence);
          return {
            field: `task_${sequence}`,
            message: row
              ? `${row.name} is not completed.`
              : `Task ${sequence} is not completed.`,
          };
        }),
      };
    }
  }

  return { ok: true };
}

export const PREREQUISITE_MESSAGES = {
  task9: TASK_9_MESSAGE,
  task10: TASK_10_MESSAGE,
} as const;
