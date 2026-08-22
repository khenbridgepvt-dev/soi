import { describe, expect, it } from 'vitest';

import {
  formatCustomTaskAssignSuccessMessage,
  getCustomTaskAssignModalTitle,
  getCustomTaskAssignSubmitLabel,
  showsCustomTaskAssignAuditSection,
} from '@/lib/schedule/custom-task-assign-ui';

describe('custom-task-assign-ui', () => {
  it('hides audit section for team variant', () => {
    expect(showsCustomTaskAssignAuditSection('team')).toBe(false);
    expect(showsCustomTaskAssignAuditSection('advanced')).toBe(true);
  });

  it('uses team copy for title and submit labels', () => {
    expect(getCustomTaskAssignModalTitle('team')).toBe('Assign team task');
    expect(getCustomTaskAssignSubmitLabel('team', false)).toBe('Assign');
    expect(getCustomTaskAssignSubmitLabel('team', true)).toBe('Assigning…');
  });

  it('uses advanced copy for title and submit labels', () => {
    expect(getCustomTaskAssignModalTitle('advanced')).toBe('Add custom task & assign');
    expect(getCustomTaskAssignSubmitLabel('advanced', false)).toBe('Create & assign');
    expect(getCustomTaskAssignSubmitLabel('advanced', true)).toBe('Creating…');
  });

  it('formats team success toast', () => {
    expect(
      formatCustomTaskAssignSuccessMessage('team', 'Asha', '10:00'),
    ).toBe('Team task assigned to Asha at 10:00.');
  });
});
