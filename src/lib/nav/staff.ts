import type { NavItem, NavSection } from './types';

export const STAFF_NAV_MAIN: NavItem[] = [
  { href: '/staff/tasks', label: 'My tasks' },
  { href: '/staff/calendar', label: 'My calendar' },
];

export const STAFF_NAV_ADVANCED: NavItem[] = [
  { href: '/staff/dashboard', label: 'Dashboard' },
  { href: '/staff/cases', label: 'Cases' },
  { href: '/staff/reminders', label: 'Reminders' },
  { href: '/staff/profile', label: 'My Profile' },
];

export const STAFF_NAV_SECTIONS: NavSection[] = [
  { label: 'Main', items: STAFF_NAV_MAIN },
  { label: 'Advanced', items: STAFF_NAV_ADVANCED },
];

/** @deprecated Use STAFF_NAV_SECTIONS — flat list kept for tests that need all links. */
export const STAFF_NAV: NavItem[] = [
  ...STAFF_NAV_MAIN,
  ...STAFF_NAV_ADVANCED,
];
