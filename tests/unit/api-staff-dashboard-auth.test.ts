import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

import { GET } from '@/app/api/dashboard/staff/route';

describe('staff dashboard API auth (ticket 0050)', () => {
  beforeEach(() => {
    createClientMock.mockReset();
  });

  it('returns 401 for unauthenticated GET /api/dashboard/staff', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null } }),
      },
    });

    const response = await GET(new Request('http://localhost/api/dashboard/staff?view=today'));

    expect(response.status).toBe(401);

    const json = (await response.json()) as { error?: { code?: string } };
    expect(json.error?.code).toBe('UNAUTHORIZED');
  });
});
