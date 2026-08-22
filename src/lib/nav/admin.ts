import type { NavItem, NavSection } from './types';

export const ADMIN_NAV_MAIN: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cases', label: 'Cases' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/task-board', label: 'Task Board' },
  { href: '/reminders', label: 'Reminders' },
  { href: '/team', label: 'Team' },
  { href: '/blocked', label: 'Blocked Tasks' },
];

export const ADMIN_NAV_ADVANCED: NavItem[] = [
  { href: '/archive', label: 'Archive' },
  { href: '/settings/application-types', label: 'Application Types' },
  { href: '/settings/covering-letterhead', label: 'Covering Letterhead' },
  { href: '/settings/staff', label: 'Staff Members' },
  { href: '/settings/profile', label: 'My Profile' },
];

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  { label: 'Main', items: ADMIN_NAV_MAIN },
  { label: 'Advanced', items: ADMIN_NAV_ADVANCED },
];

/** @deprecated Use ADMIN_NAV_SECTIONS — flat list kept for tests that need all links. */
export const ADMIN_NAV: NavItem[] = [
  ...ADMIN_NAV_MAIN,
  ...ADMIN_NAV_ADVANCED,
];
