import { isTeamTaskSlotEndOverdue } from '@/lib/tasks/team-task-status-colour';

export type TeamWorkloadAssignment = {
  task_status: string;
  is_overdue?: boolean;
  start_time: string;
  end_time: string;
  case_deleted?: boolean;
  task_deleted?: boolean;
};

export type TeamWorkloadStaffMember = {
  id: string;
  full_name: string;
  assignments: TeamWorkloadAssignment[];
};

export type TeamWorkloadSummary = {
  staffId: string;
  staffName: string;
  inProgress: number;
  doneToday: number;
  overdue: number;
};

function isCountableAssignment(assignment: TeamWorkloadAssignment): boolean {
  return !assignment.case_deleted && !assignment.task_deleted;
}

function isOverdueAssignment(
  assignment: TeamWorkloadAssignment,
  viewedDate: string,
  now?: Date,
): boolean {
  const status = assignment.task_status;

  if (status === 'completed' || status === 'blocked') {
    return false;
  }

  return (
    assignment.is_overdue === true ||
    isTeamTaskSlotEndOverdue(
      {
        task_status: status,
        assignmentDate: viewedDate,
        end_time: assignment.end_time,
        now,
      },
      viewedDate,
    )
  );
}

/** Per-staff counts for the viewed schedule day (ticket 0099). */
export function buildTeamWorkloadSummaries(
  staff: TeamWorkloadStaffMember[],
  viewedDate: string,
  now?: Date,
): TeamWorkloadSummary[] {
  return staff.map((member) => {
    let inProgress = 0;
    let doneToday = 0;
    let overdue = 0;

    for (const assignment of member.assignments) {
      if (!isCountableAssignment(assignment)) {
        continue;
      }

      const status = assignment.task_status;

      if (status === 'completed') {
        doneToday += 1;
        continue;
      }

      if (isOverdueAssignment(assignment, viewedDate, now)) {
        overdue += 1;
        continue;
      }

      if (status === 'in_progress') {
        inProgress += 1;
      }
    }

    return {
      staffId: member.id,
      staffName: member.full_name,
      inProgress,
      doneToday,
      overdue,
    };
  });
}
