import { minutesBetween } from '@/lib/utils/dates';
import { MIN_ASSIGNMENT_MINUTES } from '@/lib/utils/availability';

export type ScheduleAssignStaffInput = {
  id: string;
  full_name: string;
  is_on_leave: boolean;
  working_hours: { start: string; end: string } | null;
  available_slots: { start: string; end: string }[];
  slots: { start: string; end: string; state: 'available' | 'booked' | 'off_hours' }[];
};

export type ScheduleAssignPrefill = {
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
};

const DEFAULT_START_TIME = '09:00';
const DEFAULT_DURATION_MINUTES = 30;

function isActiveStaff(member: ScheduleAssignStaffInput): boolean {
  return (
    !member.is_on_leave &&
    (member.working_hours !== null || member.available_slots.length > 0)
  );
}

function findFirstAvailableSlot(
  member: ScheduleAssignStaffInput,
): { start: string; end: string } | null {
  const fromAvailable = member.available_slots[0];
  if (fromAvailable) {
    return fromAvailable;
  }

  const fromSlots = member.slots.find((slot) => slot.state === 'available');
  if (fromSlots) {
    return { start: fromSlots.start, end: fromSlots.end };
  }

  return null;
}

/** Default prefill for header "+ Assign task" on the team schedule. */
export function buildScheduleAssignPrefill(
  staff: ScheduleAssignStaffInput[],
  date: string,
): ScheduleAssignPrefill | null {
  if (staff.length === 0) {
    return null;
  }

  const member = staff.find(isActiveStaff) ?? staff[0];
  if (!member) {
    return null;
  }

  const slot = findFirstAvailableSlot(member);
  const startTime = slot?.start ?? member.working_hours?.start ?? DEFAULT_START_TIME;
  const rawDuration = slot ? minutesBetween(slot.start, slot.end) : DEFAULT_DURATION_MINUTES;
  const durationMinutes = Math.max(rawDuration, MIN_ASSIGNMENT_MINUTES);

  return {
    staffId: member.id,
    staffName: member.full_name,
    date,
    startTime,
    durationMinutes,
  };
}
