import { describe, expect, it } from 'vitest';
import {
  buildPaginationMeta,
  parseCaseListQuery,
} from '@/lib/cases/list-query';

describe('parseCaseListQuery', () => {
  it('defaults page, limit, and sort', () => {
    const parsed = parseCaseListQuery(new URLSearchParams(), 'admin');

    expect(parsed).toEqual({
      page: 1,
      limit: 25,
      sortBy: 'created_at',
      sortOrder: 'desc',
      status: undefined,
      isUrgent: undefined,
      applicationTypeId: undefined,
      assignedTo: undefined,
      assignedToUnassigned: false,
      urgency: undefined,
      q: undefined,
    });
  });

  it('maps status, type, staff, and urgent filters for admin', () => {
    const params = new URLSearchParams({
      page: '2',
      limit: '50',
      status: 'active',
      application_type_id: 'a0000000-0000-4000-8000-000000000003',
      assigned_to: 'a0000000-0000-4000-8000-000000000004',
      is_urgent: 'true',
      q: 'Patel',
      sort_by: 'client_last_name',
      sort_order: 'asc',
    });

    const parsed = parseCaseListQuery(params, 'admin');

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
    expect(parsed.status).toBe('active');
    expect(parsed.applicationTypeId).toBe('a0000000-0000-4000-8000-000000000003');
    expect(parsed.assignedTo).toBe('a0000000-0000-4000-8000-000000000004');
    expect(parsed.isUrgent).toBe(true);
    expect(parsed.q).toBe('Patel');
    expect(parsed.sortBy).toBe('client_last_name');
    expect(parsed.sortOrder).toBe('asc');
  });

  it('ignores assigned_to for staff role', () => {
    const params = new URLSearchParams({
      assigned_to: 'a0000000-0000-4000-8000-000000000004',
    });

    const parsed = parseCaseListQuery(params, 'staff');

    expect(parsed.assignedTo).toBeUndefined();
    expect(parsed.assignedToUnassigned).toBe(false);
  });

  it('maps urgency blocked and unassigned for admin', () => {
    const blocked = parseCaseListQuery(new URLSearchParams({ urgency: 'blocked' }), 'admin');
    expect(blocked.urgency).toBe('blocked');

    const unassigned = parseCaseListQuery(
      new URLSearchParams({ assigned_to: 'unassigned' }),
      'admin',
    );
    expect(unassigned.assignedToUnassigned).toBe(true);
    expect(unassigned.assignedTo).toBeUndefined();

    const urgentViaUrgency = parseCaseListQuery(new URLSearchParams({ urgency: 'urgent' }), 'admin');
    expect(urgentViaUrgency.isUrgent).toBe(true);
    expect(urgentViaUrgency.urgency).toBeUndefined();
  });

  it('clamps limit to 100 and rejects invalid UUIDs', () => {
    const parsed = parseCaseListQuery(
      new URLSearchParams({
        limit: '500',
        application_type_id: 'not-a-uuid',
        assigned_to: 'bad',
      }),
      'admin',
    );

    expect(parsed.limit).toBe(100);
    expect(parsed.applicationTypeId).toBeUndefined();
    expect(parsed.assignedTo).toBeUndefined();
  });
});

describe('buildPaginationMeta', () => {
  it('computes pages and navigation flags', () => {
    expect(buildPaginationMeta(1, 25, 42)).toEqual({
      page: 1,
      limit: 25,
      total: 42,
      total_pages: 2,
      has_next: true,
      has_prev: false,
    });

    expect(buildPaginationMeta(2, 25, 42)).toEqual({
      page: 2,
      limit: 25,
      total: 42,
      total_pages: 2,
      has_next: false,
      has_prev: true,
    });
  });
});
