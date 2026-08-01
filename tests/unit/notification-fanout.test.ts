import { describe, expect, it } from 'vitest';
import {
  buildRevisionStaffNotificationRows,
  buildSeniorRevisionAdminAlertRows,
  buildUrgentCaseNotifications,
  collectAssignedStaffIds,
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
