import { describe, expect, it } from 'vitest';

import {
  buildTeamAssignSummary,
  formatCustomTaskAssignSuccessMessage,
  formatTeamAssignDuration,
  formatTeamAssignDurationError,
  formatTeamAssignOffDayError,
  getCustomTaskAssignModalTitle,
  getCustomTaskAssignSubmitLabel,
  getCustomTaskAssignSubtitle,
  getTeamAssignEmptySummary,
  isTeamAssignDurationPreset,
  showsCustomTaskAssignAuditSection,
  TEAM_ASSIGN_DURATION_PRESETS,
} from '@/lib/schedule/custom-task-assign-ui';

describe('custom-task-assign-ui', () => {
  it('hides audit section for team variant', () => {
    expect(showsCustomTaskAssignAuditSection('team')).toBe(false);
    expect(showsCustomTaskAssignAuditSection('advanced')).toBe(true);
  });

  it('uses team copy for title, subtitle, and submit labels', () => {
    expect(getCustomTaskAssignModalTitle('team')).toBe('Assign team task');
    expect(getCustomTaskAssignSubtitle('team')).toContain('Internal firm task');
    expect(getCustomTaskAssignSubmitLabel('team', false)).toBe('Assign to schedule');
    expect(getCustomTaskAssignSubmitLabel('team', true)).toBe('Assigning…');
  });

  it('uses advanced copy for title and submit labels', () => {
    expect(getCustomTaskAssignModalTitle('advanced')).toBe('Add custom task & assign');
    expect(getCustomTaskAssignSubtitle('advanced')).toBeNull();
    expect(getCustomTaskAssignSubmitLabel('advanced', false)).toBe('Create & assign');
    expect(getCustomTaskAssignSubmitLabel('advanced', true)).toBe('Creating…');
  });

  it('formats team success toast with date and time range', () => {
    expect(
      formatCustomTaskAssignSuccessMessage('team', 'Asha', '10:15', {
        date: '2026-08-22',
        endTime: '11:45',
      }),
    ).toBe('Task assigned to Asha — Sat 22 Aug 2026, 10:15–11:45.');
  });

  it('formats team assign summary and duration labels', () => {
    expect(getTeamAssignEmptySummary()).toBe('Complete the form to preview the assignment.');
    expect(
      buildTeamAssignSummary('Asha', '2026-08-22', '10:15', '11:45', 90),
    ).toBe('Asha · Sat 22 Aug 2026 · 10:15–11:45 (1 hr 30 min)');
    expect(formatTeamAssignDuration(15)).toBe('15 min');
    expect(formatTeamAssignDuration(60)).toBe('1 hr');
    expect(formatTeamAssignDuration(90)).toBe('1 hr 30 min');
    expect(TEAM_ASSIGN_DURATION_PRESETS).toEqual([15, 30, 60, 120]);
    expect(isTeamAssignDurationPreset(30)).toBe(true);
    expect(isTeamAssignDurationPreset(45)).toBe(false);
  });

  it('formats team validation copy', () => {
    expect(formatTeamAssignOffDayError('Asha')).toBe(
      'Asha is off on this date. Pick another date or assignee.',
    );
    expect(formatTeamAssignDurationError()).toBe(
      'Length must be between 15 minutes and 8 hours.',
    );
  });
});
