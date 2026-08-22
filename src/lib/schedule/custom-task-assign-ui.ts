export type CustomTaskAssignVariant = 'team' | 'advanced';

export function showsCustomTaskAssignAuditSection(
  variant: CustomTaskAssignVariant,
): boolean {
  return variant === 'advanced';
}

export function getCustomTaskAssignModalTitle(variant: CustomTaskAssignVariant): string {
  return variant === 'team' ? 'Assign team task' : 'Add custom task & assign';
}

export function getCustomTaskAssignSubmitLabel(
  variant: CustomTaskAssignVariant,
  submitting: boolean,
): string {
  if (submitting) {
    return variant === 'team' ? 'Assigning…' : 'Creating…';
  }

  return variant === 'team' ? 'Assign' : 'Create & assign';
}

export function formatCustomTaskAssignSuccessMessage(
  variant: CustomTaskAssignVariant,
  staffName: string,
  assignedTime: string,
): string {
  if (variant === 'team') {
    return `Team task assigned to ${staffName} at ${assignedTime}.`;
  }

  return `Ad-hoc task assigned to ${staffName} at ${assignedTime}.`;
}
