import { beforeEach, describe, expect, it, vi } from 'vitest';

const assignTaskMock = vi.fn();
const fanoutRescheduleResponseNotificationMock = vi.fn();

vi.mock('@/lib/tasks/assign-task', () => ({
  assignTask: (...args: unknown[]) => assignTaskMock(...args),
}));

vi.mock('@/lib/notifications', () => ({
  fanoutRescheduleResponseNotification: (...args: unknown[]) =>
    fanoutRescheduleResponseNotificationMock(...args),
}));

import { approveRescheduleRequest } from '@/lib/tasks/resolve-reschedule-request';

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createClient(handlers: {
  select?: () => QueryResult;
  update?: () => QueryResult;
}) {
  const selectResult = handlers.select?.() ?? { data: null, error: null };
  const updateResult = handlers.update?.() ?? { data: null, error: null };

  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(selectResult),
    update: vi.fn().mockReturnThis(),
  };

  builder.update = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(updateResult),
  }));

  return {
    from: vi.fn(() => builder),
    builder,
  };
}

describe('approveRescheduleRequest', () => {
  beforeEach(() => {
    assignTaskMock.mockReset();
    fanoutRescheduleResponseNotificationMock.mockReset();
    fanoutRescheduleResponseNotificationMock.mockResolvedValue(1);
  });

  it('returns 409 when the request is already resolved', async () => {
    const client = createClient({
      select: () => ({
        data: {
          id: 'req-1',
          task_id: 'task-1',
          assignment_id: 'assign-1',
          requested_by: 'staff-a',
          proposed_date: '2026-08-20',
          proposed_start_time: '10:00:00',
          proposed_duration_minutes: 60,
          status: 'approved',
          task_assignments: { staff_id: 'staff-a', is_released: false },
          tasks: {
            name: 'CCL',
            case_id: 'case-1',
            cases: { reference: '072601/SKW/VIS' },
          },
        },
        error: null,
      }),
    });

    const result = await approveRescheduleRequest(
      client as never,
      '11111111-1111-4111-8111-111111111111',
      'admin-a',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(409);
    }
    expect(assignTaskMock).not.toHaveBeenCalled();
  });

  it('approves a pending request and notifies staff', async () => {
    assignTaskMock.mockResolvedValue({
      ok: true,
      data: {
        task_id: 'task-1',
        assignment_id: 'assign-2',
        staff_id: 'staff-a',
        staff_name: 'Asha',
        date: '2026-08-20',
        start_time: '10:00',
        end_time: '11:00',
        duration_minutes: 60,
        is_overtime: false,
        notification_sent: false,
      },
    });

    const client = createClient({
      select: () => ({
        data: {
          id: 'req-1',
          task_id: 'task-1',
          assignment_id: 'assign-1',
          requested_by: 'staff-a',
          proposed_date: '2026-08-20',
          proposed_start_time: '10:00:00',
          proposed_duration_minutes: 60,
          status: 'pending',
          task_assignments: { staff_id: 'staff-a', is_released: false },
          tasks: {
            name: 'CCL',
            case_id: 'case-1',
            cases: { reference: '072601/SKW/VIS' },
          },
        },
        error: null,
      }),
      update: () => ({
        data: { id: 'req-1', status: 'approved', rejection_reason: null },
        error: null,
      }),
    });

    const result = await approveRescheduleRequest(
      client as never,
      '11111111-1111-4111-8111-111111111111',
      'admin-a',
    );

    expect(result.ok).toBe(true);
    expect(assignTaskMock).toHaveBeenCalledWith(
      client,
      'task-1',
      {
        staff_id: 'staff-a',
        date: '2026-08-20',
        start_time: '10:00',
        duration_minutes: 60,
      },
      { mode: 'reassign', skipNotification: true },
    );
    expect(fanoutRescheduleResponseNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'staff-a',
        outcome: 'approved',
      }),
    );
  });
});
