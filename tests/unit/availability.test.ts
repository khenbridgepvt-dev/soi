import { describe, expect, it } from 'vitest';
import {
  buildSlotTimeline,
  computeAvailableSlots,
  computeGridRange,
  computeSlotStates,
  fromMinutes,
  mergeIntervals,
  subtractIntervals,
  toMinutes,
} from '@/lib/utils/availability';

describe('toMinutes / fromMinutes', () => {
  it.each([
    ['00:00', 0],
    ['09:00', 540],
    ['09:30', 570],
    ['23:30', 1410],
    ['24:00', 1440],
  ])('converts %s to %i minutes', (time, minutes) => {
    expect(toMinutes(time)).toBe(minutes);
  });

  it('accepts the HH:MM:SS form Postgres returns', () => {
    expect(toMinutes('09:30:00')).toBe(570);
  });

  it('round-trips through fromMinutes', () => {
    expect(fromMinutes(570)).toBe('09:30');
    expect(fromMinutes(1440)).toBe('24:00');
    expect(fromMinutes(0)).toBe('00:00');
  });
});

describe('mergeIntervals', () => {
  it('returns an empty list unchanged', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  it('sorts out-of-order disjoint intervals without merging', () => {
    expect(
      mergeIntervals([
        { start: '14:00', end: '15:00' },
        { start: '09:00', end: '10:00' },
      ]),
    ).toEqual([
      { start: '09:00', end: '10:00' },
      { start: '14:00', end: '15:00' },
    ]);
  });

  it('merges overlapping intervals', () => {
    expect(
      mergeIntervals([
        { start: '09:00', end: '11:00' },
        { start: '10:00', end: '12:00' },
      ]),
    ).toEqual([{ start: '09:00', end: '12:00' }]);
  });

  it('merges adjacent (touching) intervals', () => {
    expect(
      mergeIntervals([
        { start: '09:00', end: '11:00' },
        { start: '11:00', end: '13:00' },
      ]),
    ).toEqual([{ start: '09:00', end: '13:00' }]);
  });

  it('merges an interval fully contained in another', () => {
    expect(
      mergeIntervals([
        { start: '09:00', end: '17:00' },
        { start: '11:00', end: '12:00' },
      ]),
    ).toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('merges a chain of three into one', () => {
    expect(
      mergeIntervals([
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '10:30', end: '12:00' },
      ]),
    ).toEqual([{ start: '09:00', end: '12:00' }]);
  });
});

describe('subtractIntervals', () => {
  const workingDay = { start: '09:00', end: '17:00' };

  it('returns the whole base when nothing is subtracted', () => {
    expect(subtractIntervals(workingDay, [])).toEqual([workingDay]);
  });

  it('carves a hole out of the middle', () => {
    expect(subtractIntervals(workingDay, [{ start: '11:00', end: '13:00' }])).toEqual([
      { start: '09:00', end: '11:00' },
      { start: '13:00', end: '17:00' },
    ]);
  });

  it('trims a block flush with the start', () => {
    expect(subtractIntervals(workingDay, [{ start: '09:00', end: '11:00' }])).toEqual([
      { start: '11:00', end: '17:00' },
    ]);
  });

  it('trims a block flush with the end', () => {
    expect(subtractIntervals(workingDay, [{ start: '15:00', end: '17:00' }])).toEqual([
      { start: '09:00', end: '15:00' },
    ]);
  });

  it('returns nothing when the base is fully covered', () => {
    expect(subtractIntervals(workingDay, [{ start: '08:00', end: '18:00' }])).toEqual([]);
  });

  it('ignores blocks that fall entirely outside the base', () => {
    expect(
      subtractIntervals(workingDay, [
        { start: '06:00', end: '08:00' },
        { start: '18:00', end: '20:00' },
      ]),
    ).toEqual([workingDay]);
  });

  it('clips a block that straddles the base start', () => {
    expect(subtractIntervals(workingDay, [{ start: '08:00', end: '10:00' }])).toEqual([
      { start: '10:00', end: '17:00' },
    ]);
  });

  it('clips a block that straddles the base end', () => {
    expect(subtractIntervals(workingDay, [{ start: '16:00', end: '19:00' }])).toEqual([
      { start: '09:00', end: '16:00' },
    ]);
  });

  it('treats back-to-back blocks as one hole, not two', () => {
    expect(
      subtractIntervals(workingDay, [
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
      ]),
    ).toEqual([
      { start: '09:00', end: '10:00' },
      { start: '12:00', end: '17:00' },
    ]);
  });

  it('returns an empty list for a zero-length base', () => {
    expect(subtractIntervals({ start: '09:00', end: '09:00' }, [])).toEqual([]);
  });
});

describe('computeAvailableSlots', () => {
  it('returns nothing for a non-working day (empty timetable)', () => {
    expect(computeAvailableSlots(null, [])).toEqual([]);
  });

  it('returns nothing for a non-working day even with assignments booked', () => {
    expect(computeAvailableSlots(null, [{ start: '09:00', end: '10:00' }])).toEqual([]);
  });

  it('returns the whole working day when nothing is booked', () => {
    expect(computeAvailableSlots({ start: '09:00', end: '17:00' }, [])).toEqual([
      { start: '09:00', end: '17:00' },
    ]);
  });

  it('merges contiguous free periods into single slots (EP-24)', () => {
    expect(
      computeAvailableSlots({ start: '09:00', end: '17:00' }, [
        { start: '09:00', end: '11:00' },
        { start: '13:00', end: '15:00' },
      ]),
    ).toEqual([
      { start: '11:00', end: '13:00' },
      { start: '15:00', end: '17:00' },
    ]);
  });

  it('ignores assignments booked outside the timetable (overtime)', () => {
    expect(
      computeAvailableSlots({ start: '09:00', end: '17:00' }, [
        { start: '18:00', end: '19:00' },
      ]),
    ).toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('returns nothing when the day is fully booked', () => {
    expect(
      computeAvailableSlots({ start: '09:00', end: '17:00' }, [
        { start: '09:00', end: '13:00' },
        { start: '13:00', end: '17:00' },
      ]),
    ).toEqual([]);
  });

  it('handles a midnight-to-midnight working day', () => {
    expect(
      computeAvailableSlots({ start: '00:00', end: '24:00' }, [
        { start: '00:00', end: '01:00' },
        { start: '23:00', end: '24:00' },
      ]),
    ).toEqual([{ start: '01:00', end: '23:00' }]);
  });

  it('handles unsorted, overlapping assignments', () => {
    expect(
      computeAvailableSlots({ start: '09:00', end: '17:00' }, [
        { start: '14:00', end: '16:00' },
        { start: '09:30', end: '11:00' },
        { start: '10:00', end: '12:00' },
      ]),
    ).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '12:00', end: '14:00' },
      { start: '16:00', end: '17:00' },
    ]);
  });
});

describe('computeGridRange', () => {
  it('returns null when there is nothing to show', () => {
    expect(computeGridRange([])).toBeNull();
  });

  it('ignores null working hours', () => {
    expect(computeGridRange([null, null])).toBeNull();
  });

  it('spans the earliest start to the latest end across staff', () => {
    expect(
      computeGridRange([
        { start: '09:00', end: '17:00' },
        { start: '10:00', end: '18:00' },
      ]),
    ).toEqual({ start: '09:00', end: '18:00' });
  });

  it('widens to cover assignments booked outside every timetable', () => {
    expect(
      computeGridRange([
        { start: '09:00', end: '17:00' },
        { start: '07:30', end: '08:00' },
        { start: '18:00', end: '19:30' },
      ]),
    ).toEqual({ start: '07:30', end: '19:30' });
  });

  it('snaps a misaligned range outward to 30-minute boundaries', () => {
    expect(computeGridRange([{ start: '09:15', end: '17:20' }])).toEqual({
      start: '09:00',
      end: '17:30',
    });
  });

  it('never runs past the end of the day', () => {
    expect(computeGridRange([{ start: '23:00', end: '24:00' }])).toEqual({
      start: '23:00',
      end: '24:00',
    });
  });
});

describe('buildSlotTimeline', () => {
  it('returns an empty timeline for a null range', () => {
    expect(buildSlotTimeline(null)).toEqual([]);
  });

  it('slices a range into 30-minute rows (DS-1)', () => {
    expect(buildSlotTimeline({ start: '09:00', end: '11:00' })).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '10:00' },
      { start: '10:00', end: '10:30' },
      { start: '10:30', end: '11:00' },
    ]);
  });

  it('includes a trailing partial row rather than dropping it', () => {
    expect(buildSlotTimeline({ start: '09:00', end: '09:45' })).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '09:45' },
    ]);
  });

  it('reaches the end of the day without overflowing', () => {
    const timeline = buildSlotTimeline({ start: '23:00', end: '24:00' });
    expect(timeline).toEqual([
      { start: '23:00', end: '23:30' },
      { start: '23:30', end: '24:00' },
    ]);
  });
});

describe('computeSlotStates', () => {
  const timeline = buildSlotTimeline({ start: '09:00', end: '11:00' });

  it('marks every row off-hours when the timetable is empty', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: null,
      assignments: [],
    });

    expect(slots.map((slot) => slot.state)).toEqual([
      'off_hours',
      'off_hours',
      'off_hours',
      'off_hours',
    ]);
  });

  it('marks rows inside the timetable available', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [],
    });

    expect(slots.every((slot) => slot.state === 'available')).toBe(true);
    expect(slots.every((slot) => slot.assignment_id === null)).toBe(true);
  });

  it('marks rows covered by an assignment booked, carrying its id', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [{ id: 'a1', start: '09:30', end: '10:30' }],
    });

    expect(slots.map((slot) => slot.state)).toEqual([
      'available',
      'booked',
      'booked',
      'available',
    ]);
    expect(slots[1].assignment_id).toBe('a1');
    expect(slots[2].assignment_id).toBe('a1');
    expect(slots[0].assignment_id).toBeNull();
  });

  it('books a row an assignment only partly covers', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [{ id: 'a1', start: '09:00', end: '09:15' }],
    });

    expect(slots[0].state).toBe('booked');
    expect(slots[1].state).toBe('available');
  });

  it('books rows outside the timetable when an assignment covers them (overtime)', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '10:00', end: '11:00' },
      assignments: [{ id: 'a1', start: '09:00', end: '09:30' }],
    });

    expect(slots.map((slot) => slot.state)).toEqual([
      'booked',
      'off_hours',
      'available',
      'available',
    ]);
  });

  it('keeps adjacent assignments distinguishable by id', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [
        { id: 'a1', start: '09:00', end: '10:00' },
        { id: 'a2', start: '10:00', end: '11:00' },
      ],
    });

    expect(slots.map((slot) => slot.assignment_id)).toEqual(['a1', 'a1', 'a2', 'a2']);
  });

  it('flags the first row of an assignment so the client can span the block', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [{ id: 'a1', start: '09:30', end: '10:30' }],
    });

    expect(slots.map((slot) => slot.is_assignment_start)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it('reports the block height on the first row and 1 everywhere else', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [{ id: 'a1', start: '09:30', end: '10:30' }],
    });

    expect(slots.map((slot) => slot.span)).toEqual([1, 2, 1, 1]);
  });

  it('counts only the rows visible in the timeline when a block is clipped', () => {
    const slots = computeSlotStates({
      timeline: buildSlotTimeline({ start: '09:00', end: '10:00' }),
      workingHours: { start: '09:00', end: '10:00' },
      assignments: [{ id: 'a1', start: '09:30', end: '12:00' }],
    });

    expect(slots.map((slot) => slot.span)).toEqual([1, 1]);
    expect(slots[1].is_assignment_start).toBe(true);
  });

  it('does not book a row that merely touches an assignment boundary', () => {
    const slots = computeSlotStates({
      timeline,
      workingHours: { start: '09:00', end: '11:00' },
      assignments: [{ id: 'a1', start: '09:00', end: '09:30' }],
    });

    expect(slots[0].state).toBe('booked');
    expect(slots[1].state).toBe('available');
  });
});
