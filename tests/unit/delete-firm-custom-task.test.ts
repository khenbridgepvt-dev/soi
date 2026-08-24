import { describe, expect, it } from 'vitest';
import { deleteFirmCustomTask } from '@/lib/tasks/delete-firm-custom-task';

describe('delete firm custom task (ticket 0122)', () => {
  it('returns not found when the task does not exist', async () => {
    const client = {
      from: (table: string) => {
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }

        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: [], error: null }),
            }),
          }),
        };
      },
    };

    const result = await deleteFirmCustomTask(client as never, 'task-id', 'admin-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it('maps permission denied on release to forbidden', async () => {
    const client = {
      from: (table: string) => {
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'task-id',
                    name: 'Firm task',
                    abbreviation: 'FT',
                    description: null,
                    status: 'not_started',
                    is_custom: true,
                    is_deleted: false,
                    case_id: 'f0000000-0000-4000-8000-000000000001',
                    cases: {
                      id: 'f0000000-0000-4000-8000-000000000001',
                      is_internal: true,
                      status: 'active',
                    },
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [{ id: 'assignment-id' }],
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({
                error: { code: '42501', message: 'Permission denied' },
              }),
            }),
          }),
        };
      },
    };

    const result = await deleteFirmCustomTask(client as never, 'task-id', 'admin-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});
