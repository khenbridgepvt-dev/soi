import { describe, expect, it } from 'vitest';
import {
  calculateWeeklyHours,
  generateTimeSlotOptions,
  isTimeAlignedTo30Minutes,
  validateTimePair,
  validateTimetable,
} from '@/lib/utils/dates';

describe('generateTimeSlotOptions (DS-1)', () => {
  it('returns 48 half-hour slots across a day', () => {
    const slots = generateTimeSlotOptions();
    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe('00:00');
    expect(slots[1]).toBe('00:30');
    expect(slots.at(-1)).toBe('23:30');
  });
});

describe('isTimeAlignedTo30Minutes', () => {
  it.each(['09:00', '09:30', '17:30', '00:00'])('accepts %s', (time) => {
    expect(isTimeAlignedTo30Minutes(time)).toBe(true);
  });

  it.each(['09:15', '10:45', '12:01'])('rejects %s', (time) => {
    expect(isTimeAlignedTo30Minutes(time)).toBe(false);
  });
});

describe('validateTimePair', () => {
  it('accepts both null for a day off', () => {
    expect(validateTimePair(null, null, 'mon')).toEqual({
      ok: true,
      start: null,
      end: null,
    });
  });

  it('accepts a valid working pair', () => {
    expect(validateTimePair('09:00', '17:00', 'mon')).toEqual({
      ok: true,
      start: '09:00',
      end: '17:00',
    });
  });

  it('rejects mixed null pair', () => {
    const result = validateTimePair('09:00', null, 'mon');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe('mon_start');
    }
  });

  it('rejects end before start (TC-052)', () => {
    const result = validateTimePair('17:00', '09:00', 'mon');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('End time must be after start time.');
      expect(result.field).toBe('mon_end');
    }
  });

  it('rejects equal start and end', () => {
    const result = validateTimePair('09:00', '09:00', 'mon');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('End time must be after start time.');
    }
  });

  it('rejects misaligned 30-minute slots', () => {
    const result = validateTimePair('09:15', '17:00', 'mon');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('30-minute');
    }
  });
});

describe('validateTimetable', () => {
  it('accepts a full valid week', () => {
    const result = validateTimetable({
      mon_start: '10:00',
      mon_end: '18:00',
      tue_start: '10:00',
      tue_end: '18:00',
      wed_start: '10:00',
      wed_end: '18:00',
      thu_start: '10:00',
      thu_end: '18:00',
      fri_start: '10:00',
      fri_end: '18:00',
      sat_start: null,
      sat_end: null,
      sun_start: null,
      sun_end: null,
    });

    expect(result.ok).toBe(true);
  });

  it('collects errors from multiple invalid days', () => {
    const result = validateTimetable({
      mon_start: '17:00',
      mon_end: '09:00',
      tue_start: '09:15',
      tue_end: '17:00',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('calculateWeeklyHours', () => {
  it('sums working days only', () => {
    expect(
      calculateWeeklyHours({
        mon_start: '09:00',
        mon_end: '17:00',
        tue_start: '09:00',
        tue_end: '17:00',
        wed_start: '09:00',
        wed_end: '17:00',
        thu_start: '09:00',
        thu_end: '17:00',
        fri_start: '09:00',
        fri_end: '17:00',
        sat_start: null,
        sat_end: null,
        sun_start: null,
        sun_end: null,
      }),
    ).toBe(40);
  });
});
