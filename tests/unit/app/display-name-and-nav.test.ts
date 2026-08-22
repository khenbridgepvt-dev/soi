import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAppDisplayName, getAppMonogram } from '@/lib/app/display-name';
import {
  ADMIN_NAV_ADVANCED,
  ADMIN_NAV_MAIN,
  ADMIN_NAV_SECTIONS,
} from '@/lib/nav/admin';
import {
  STAFF_NAV_ADVANCED,
  STAFF_NAV_MAIN,
  STAFF_NAV_SECTIONS,
} from '@/lib/nav/staff';

describe('getAppDisplayName', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to Soi (Beta) when env is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_NAME', '');
    expect(getAppDisplayName()).toBe('Soi (Beta)');
  });

  it('uses NEXT_PUBLIC_APP_NAME when set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_NAME', 'Soi (Beta) (Dev)');
    expect(getAppDisplayName()).toBe('Soi (Beta) (Dev)');
  });
});

describe('getAppMonogram', () => {
  it('derives initials from the display name', () => {
    expect(getAppMonogram('Soi (Beta)')).toBe('SO');
    expect(getAppMonogram('Task Manager')).toBe('TM');
  });
});

describe('ADMIN_NAV_SECTIONS', () => {
  it('orders main navigation before advanced settings', () => {
    expect(ADMIN_NAV_SECTIONS).toHaveLength(2);
    expect(ADMIN_NAV_SECTIONS[0]?.label).toBe('Main');
    expect(ADMIN_NAV_SECTIONS[1]?.label).toBe('Advanced');
  });

  it('lists main items in the requested order', () => {
    expect(ADMIN_NAV_MAIN.map((item) => item.label)).toEqual([
      'Team Schedule',
      'Team',
    ]);
    expect(ADMIN_NAV_MAIN.map((item) => item.href)).toEqual([
      '/schedule',
      '/team',
    ]);
  });

  it('lists advanced items including dashboard and settings', () => {
    expect(ADMIN_NAV_ADVANCED.map((item) => item.href)).toEqual([
      '/dashboard',
      '/cases',
      '/task-board',
      '/reminders',
      '/blocked',
      '/archive',
      '/settings/application-types',
      '/settings/covering-letterhead',
      '/settings/staff',
      '/settings/profile',
    ]);
  });
});

describe('STAFF_NAV_SECTIONS', () => {
  it('orders main navigation before advanced settings', () => {
    expect(STAFF_NAV_SECTIONS).toHaveLength(2);
    expect(STAFF_NAV_SECTIONS[0]?.label).toBe('Main');
    expect(STAFF_NAV_SECTIONS[1]?.label).toBe('Advanced');
  });

  it('lists main items in the requested order', () => {
    expect(STAFF_NAV_MAIN.map((item) => item.label)).toEqual([
      'My tasks',
      'My calendar',
    ]);
    expect(STAFF_NAV_MAIN.map((item) => item.href)).toEqual([
      '/staff/tasks',
      '/staff/calendar',
    ]);
  });

  it('lists advanced items including dashboard and profile', () => {
    expect(STAFF_NAV_ADVANCED.map((item) => item.href)).toEqual([
      '/staff/dashboard',
      '/staff/cases',
      '/staff/reminders',
      '/staff/profile',
    ]);
  });
});
