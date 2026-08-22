import { describe, expect, it } from 'vitest';

import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { shouldFanoutFirmTaskCompletedAdminNotification } from '@/lib/tasks/firm-task-complete-notification';

describe('shouldFanoutFirmTaskCompletedAdminNotification', () => {
  it('fans out when staff completes a firm task from in progress', () => {
    expect(
      shouldFanoutFirmTaskCompletedAdminNotification({
        newStatus: 'completed',
        previousStatus: 'in_progress',
        callerRole: 'staff',
        caseId: INTERNAL_CASE_ID,
      }),
    ).toBe(true);
  });

  it('fans out when senior completes a firm task from not started', () => {
    expect(
      shouldFanoutFirmTaskCompletedAdminNotification({
        newStatus: 'completed',
        previousStatus: 'not_started',
        callerRole: 'senior',
        caseId: INTERNAL_CASE_ID,
      }),
    ).toBe(true);
  });

  it('does not fan out when admin completes on behalf', () => {
    expect(
      shouldFanoutFirmTaskCompletedAdminNotification({
        newStatus: 'completed',
        previousStatus: 'in_progress',
        callerRole: 'admin',
        caseId: INTERNAL_CASE_ID,
      }),
    ).toBe(false);
  });

  it('does not fan out for client case task completion', () => {
    expect(
      shouldFanoutFirmTaskCompletedAdminNotification({
        newStatus: 'completed',
        previousStatus: 'in_progress',
        callerRole: 'staff',
        caseId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    ).toBe(false);
  });

  it('does not fan out for in_progress only', () => {
    expect(
      shouldFanoutFirmTaskCompletedAdminNotification({
        newStatus: 'in_progress',
        previousStatus: 'not_started',
        callerRole: 'staff',
        caseId: INTERNAL_CASE_ID,
      }),
    ).toBe(false);
  });
});
