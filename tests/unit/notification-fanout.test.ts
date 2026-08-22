import { describe, expect, it } from 'vitest';
import {
  buildDuAlertNotificationRows,
  buildFirmTaskCompletedNotificationRows,
  buildLeadRejectedNotificationRows,
  buildNewTaskAssignmentNotificationRows,
  buildRescheduleRequestNotificationRows,
  buildRescheduleResponseNotificationRows,
  buildRevisionStaffNotificationRows,
  buildSeniorRevisionAdminAlertRows,
  buildTaskBlockedAdminNotificationRows,
  buildTaskOverdueNotificationRows,
  buildTaskReassignedNotificationRows,
  buildUrgentCaseNotifications,
  collectAssignedStaffIds,
  notificationDedupeKey,
} from '@/lib/notifications/fanout';

describe('collectAssignedStaffIds', () => {
  it('returns each assigned staff member once', () => {
    const ids = collectAssignedStaffIds([
      { assigned_to: 'staff-a' },
      { assigned_to: 'staff-b' },
      { assigned_to: 'staff-a' },
      { assigned_to: null },
    ]);

    expect(ids).toEqual(['staff-a', 'staff-b']);
  });

  it('returns an empty list when no tasks are assigned', () => {
    expect(collectAssignedStaffIds([{ assigned_to: null }, { assigned_to: null }])).toEqual(
      [],
    );
  });
});

describe('buildUrgentCaseNotifications', () => {
  it('builds one urgent_case row per staff member', () => {
    const rows = buildUrgentCaseNotifications({
      caseId: 'case-1',
      clientName: 'Vishnu Patel',
      adminName: 'Admin User',
      staffIds: ['staff-a', 'staff-b'],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: 'staff-a',
      type: 'urgent_case',
      is_urgent: true,
      case_id: 'case-1',
    });
    expect(rows[0].body).toContain('Vishnu Patel');
    expect(rows[0].body).toContain('Admin User');
    expect(rows[1].user_id).toBe('staff-b');
  });

  it('returns no rows when nobody is assigned', () => {
    expect(
      buildUrgentCaseNotifications({
        caseId: 'case-1',
        clientName: 'Kim Park',
        adminName: 'Admin',
        staffIds: [],
      }),
    ).toEqual([]);
  });
});

describe('buildRevisionStaffNotificationRows', () => {
  it('builds a new_task row for the assigned staff member', () => {
    const rows = buildRevisionStaffNotificationRows({
      userId: 'staff-a',
      caseId: 'case-1',
      taskId: 'task-5',
      caseReference: '072601/SKW/VIS',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 'staff-a',
      type: 'new_task',
      case_id: 'case-1',
      task_id: 'task-5',
    });
    expect(rows[0].body).toContain('072601/SKW/VIS');
    expect(rows[0].body).toContain('revisions');
  });
});

describe('buildSeniorRevisionAdminAlertRows', () => {
  it('builds one senior_revision_alert row per admin', () => {
    const rows = buildSeniorRevisionAdminAlertRows({
      adminIds: ['admin-a', 'admin-b'],
      caseId: 'case-1',
      message: 'Case 072601/SKW/VIS has had 3 senior review revision cycles',
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: 'admin-a',
      type: 'senior_revision_alert',
      case_id: 'case-1',
    });
    expect(rows[1].user_id).toBe('admin-b');
    expect(rows[0].body).toContain('3 senior review revision cycles');
  });
});

describe('buildNewTaskAssignmentNotificationRows', () => {
  it('builds a new_task row with schedule details', () => {
    const rows = buildNewTaskAssignmentNotificationRows({
      userId: 'staff-a',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'Client Consultation',
      caseReference: '072601/SKW/VIS',
      startTime: '11:00',
      endTime: '13:00',
      durationMinutes: 120,
      isUrgent: true,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 'staff-a',
      type: 'new_task',
      is_urgent: true,
      task_id: 'task-1',
      case_id: 'case-1',
    });
    expect(rows[0].body).toContain('11:00–13:00');
  });
});

describe('buildTaskReassignedNotificationRows', () => {
  it('builds a reassignment notice for the previous assignee', () => {
    const rows = buildTaskReassignedNotificationRows({
      userId: 'staff-a',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
    });

    expect(rows[0].title).toBe('Task reassigned');
    expect(rows[0].body).toContain('reassigned');
  });
});

describe('buildTaskBlockedAdminNotificationRows', () => {
  it('summarises released slots for each admin', () => {
    const rows = buildTaskBlockedAdminNotificationRows({
      adminIds: ['admin-a'],
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      blockedReason: 'Client not responding',
      releasedSlots: [
        {
          staff_name: 'Asha',
          date: '2026-07-08',
          start_time: '11:00',
          end_time: '13:00',
        },
      ],
    });

    expect(rows[0].type).toBe('task_blocked');
    expect(rows[0].body).toContain('Asha');
    expect(rows[0].body).toContain('Client not responding');
  });
});

describe('buildLeadRejectedNotificationRows', () => {
  it('builds one row per admin when a lead is rejected', () => {
    const rows = buildLeadRejectedNotificationRows({
      adminIds: ['admin-a'],
      caseId: 'case-1',
      clientName: 'Kim Park',
      adminName: 'Admin User',
      reasonText: 'Duplicate lead',
    });

    expect(rows[0].title).toBe('Lead Rejected');
    expect(rows[0].body).toContain('Duplicate lead');
  });
});

describe('buildTaskOverdueNotificationRows', () => {
  it('builds a deduped task_overdue row for the assignee', () => {
    const rows = buildTaskOverdueNotificationRows({
      userId: 'staff-a',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      endTime: '11:00',
    });

    expect(rows[0].type).toBe('task_overdue');
    expect(rows[0].is_urgent).toBe(true);
    expect((rows[0].payload as { dedupe_key: string }).dedupe_key).toBe(
      notificationDedupeKey('staff-a', 'task_overdue', ['task-1']),
    );
  });
});

describe('buildRescheduleRequestNotificationRows', () => {
  it('builds one reschedule_request row per admin', () => {
    const rows = buildRescheduleRequestNotificationRows({
      adminIds: ['admin-a'],
      rescheduleRequestId: 'req-1',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      staffName: 'Asha',
      proposedDate: '2026-08-20',
      proposedStartTime: '10:00',
      proposedEndTime: '11:00',
      proposedDurationMinutes: 60,
      reason: null,
    });

    expect(rows[0].type).toBe('reschedule_request');
    expect(rows[0].body).toContain('10:00–11:00');
  });
});

describe('buildRescheduleResponseNotificationRows', () => {
  it('builds an approved response row', () => {
    const rows = buildRescheduleResponseNotificationRows({
      userId: 'staff-a',
      taskId: 'task-1',
      caseId: 'case-1',
      taskName: 'CCL',
      caseReference: '072601/SKW/VIS',
      outcome: 'approved',
      proposedDate: '2026-08-20',
      proposedStartTime: '10:00',
      proposedEndTime: '11:00',
    });

    expect(rows[0].type).toBe('reschedule_response');
    expect(rows[0].title).toBe('Reschedule approved');
  });
});

describe('buildFirmTaskCompletedNotificationRows', () => {
  it('builds one task_status_changed row per admin with slot time', () => {
    const rows = buildFirmTaskCompletedNotificationRows({
      adminIds: ['admin-a', 'admin-b'],
      staffName: 'Asha',
      taskName: 'Client intake',
      taskId: 'task-1',
      caseId: 'case-internal',
      slotStartTime: '11:00',
      slotEndTime: '12:00',
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: 'admin-a',
      type: 'task_status_changed',
      title: 'Team task completed',
      is_urgent: false,
      case_id: 'case-internal',
      task_id: 'task-1',
    });
    expect(rows[0].body).toBe('Asha completed Client intake · 11:00–12:00');
    expect(rows[1].user_id).toBe('admin-b');
  });

  it('omits slot time when unknown', () => {
    const rows = buildFirmTaskCompletedNotificationRows({
      adminIds: ['admin-a'],
      staffName: 'Asha',
      taskName: 'Client intake',
      taskId: 'task-1',
      caseId: 'case-internal',
    });

    expect(rows[0].body).toBe('Asha completed Client intake');
  });
});

describe('buildDuAlertNotificationRows', () => {
  it('builds a warning DU alert with a per-day dedupe key', () => {
    const rows = buildDuAlertNotificationRows({
      userId: 'staff-a',
      taskId: 'task-12',
      caseId: 'case-1',
      taskName: 'DU',
      caseReference: '072601/SKW/VIS',
      appointmentDate: '2026-07-22',
      severity: 'warning',
      alertDate: '2026-07-17',
      workingDaysRemaining: 3,
    });

    expect(rows[0].type).toBe('du_alert');
    expect(rows[0].is_urgent).toBe(false);
    expect((rows[0].payload as { dedupe_key: string }).dedupe_key).toBe(
      notificationDedupeKey('staff-a', 'du_alert', ['task-12', '2026-07-17']),
    );
  });
});
