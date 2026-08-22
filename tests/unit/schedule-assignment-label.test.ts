import { describe, expect, it } from 'vitest';
import {
  formatScheduleAssignmentAriaLabel,
  formatScheduleAssignmentCompactLabel,
  formatScheduleAssignmentDetailLine,
  formatScheduleAssignmentPrimaryLabel,
  isScheduleAssignmentNavigable,
  scheduleAssignmentPillClassName,
} from '@/lib/schedule/assignment-label';

const internalAssignment = {
  task_name: 'Clear emails',
  task_abbreviation: 'CE',
  case_reference: 'FIRM-GENERAL',
  client_name: 'Firm operations',
  start_time: '10:00',
  end_time: '11:00',
  case_is_internal: true,
  case_id: 'f0000000-0000-4000-8000-000000000001',
};

const caseAssignment = {
  task_name: 'Google Form Received',
  task_abbreviation: 'GFR',
  case_reference: '072601/SKW/VIS',
  client_name: 'Vishnu Patel',
  start_time: '14:00',
  end_time: '15:00',
  case_is_internal: false,
  case_id: 'c0000000-0000-4000-8000-000000000001',
};

describe('formatScheduleAssignmentPrimaryLabel (ticket 0045)', () => {
  it('uses task_name over abbreviation', () => {
    expect(formatScheduleAssignmentPrimaryLabel(caseAssignment)).toBe('Google Form Received');
    expect(formatScheduleAssignmentPrimaryLabel(internalAssignment)).toBe('Clear emails');
  });
});

describe('formatScheduleAssignmentCompactLabel', () => {
  it('shows task name and time for internal assignments', () => {
    expect(formatScheduleAssignmentCompactLabel(internalAssignment)).toBe(
      'Clear emails · 10:00–11:00',
    );
  });

  it('shows task name and client for case assignments', () => {
    expect(formatScheduleAssignmentCompactLabel(caseAssignment)).toBe(
      'Google Form Received · Vishnu Patel',
    );
  });
});

describe('formatScheduleAssignmentDetailLine', () => {
  it('shows time range for internal admin detail', () => {
    expect(formatScheduleAssignmentDetailLine(internalAssignment, 'admin')).toBe('10:00–11:00');
  });

  it('shows client for case admin detail', () => {
    expect(formatScheduleAssignmentDetailLine(caseAssignment, 'admin')).toBe('Vishnu Patel');
  });
});

describe('formatScheduleAssignmentAriaLabel', () => {
  it('omits case reference and client for internal assignments', () => {
    expect(formatScheduleAssignmentAriaLabel(internalAssignment, 'admin')).toBe(
      'Clear emails · 10:00–11:00',
    );
  });

  it('includes case context for client assignments', () => {
    expect(formatScheduleAssignmentAriaLabel(caseAssignment, 'admin')).toBe(
      'Google Form Received · 072601/SKW/VIS · Vishnu Patel · 14:00–15:00',
    );
  });
});

describe('scheduleAssignmentPillClassName (ticket 0048 / 0074)', () => {
  it('applies on-track green styling for completed assignments', () => {
    expect(
      scheduleAssignmentPillClassName({
        ...caseAssignment,
        task_status: 'completed',
      }),
    ).toContain('bg-status-onTrack');
  });

  it('applies amber styling for in_progress assignments (ADR-0022)', () => {
    expect(
      scheduleAssignmentPillClassName({
        ...caseAssignment,
        task_status: 'in_progress',
      }),
    ).toContain('bg-status-approaching');
  });

  it('applies red styling when reminder is due', () => {
    expect(
      scheduleAssignmentPillClassName(
        {
          ...caseAssignment,
          task_status: 'in_progress',
          reminder_date: '2026-08-10',
        },
        undefined,
        '2026-08-17',
      ),
    ).toContain('bg-error-bg');
  });
});

describe('isScheduleAssignmentNavigable', () => {
  it('blocks navigation for internal and deleted assignments', () => {
    expect(isScheduleAssignmentNavigable(internalAssignment)).toBe(false);
    expect(
      isScheduleAssignmentNavigable({ ...caseAssignment, case_deleted: true }),
    ).toBe(false);
    expect(isScheduleAssignmentNavigable(caseAssignment)).toBe(true);
  });
});
