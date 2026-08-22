import { describeOutsideHoursWarning } from '@/lib/utils/availability';
import { isTimeAlignedTo30Minutes } from '@/lib/utils/dates';

/** Client cases keep 30-minute slot alignment; firm/internal tasks do not (0111). */
export function validateAssignStartTimeAlignment(
  startTime: string,
  isInternalCase: boolean,
): string | null {
  if (!isInternalCase && !isTimeAlignedTo30Minutes(startTime)) {
    return 'start_time must align to 30-minute slots.';
  }

  return null;
}

export function buildAssignOvertimeWarnings(
  isOvertime: boolean,
  staffName: string,
  workingHours: { start: string; end: string },
): string[] | undefined {
  if (!isOvertime) {
    return undefined;
  }

  return [describeOutsideHoursWarning(staffName, workingHours)];
}
