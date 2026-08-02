import { describe, expect, it } from 'vitest';
import {
  CALENDAR_ROW_HEIGHT,
  currentTimeLabel,
  durationToPixelHeight,
  gridHeightPixels,
  isTimeWithinGrid,
  timeToPixelOffset,
} from '@/lib/utils/calendar-layout';

describe('calendar-layout', () => {
  const gridStart = '09:00';
  const gridEnd = '17:00';

  it('maps a time to the correct pixel offset from grid start', () => {
    expect(timeToPixelOffset('09:00', gridStart)).toBe(0);
    expect(timeToPixelOffset('10:00', gridStart)).toBe(80);
    expect(timeToPixelOffset('11:30', gridStart)).toBe(200);
  });

  it('converts durations to pixel heights', () => {
    expect(durationToPixelHeight('09:00', '11:00')).toBe(160);
    expect(durationToPixelHeight('11:00', '13:00')).toBe(160);
  });

  it('computes total grid canvas height', () => {
    expect(gridHeightPixels(gridStart, gridEnd)).toBe(640);
  });

  it('respects custom row height and slot minutes', () => {
    expect(
      timeToPixelOffset('10:00', gridStart, { rowHeight: 20, slotMinutes: 15 }),
    ).toBe(80);
  });

  it('detects whether a time is inside the grid bounds', () => {
    expect(isTimeWithinGrid('09:00', gridStart, gridEnd)).toBe(true);
    expect(isTimeWithinGrid('16:30', gridStart, gridEnd)).toBe(true);
    expect(isTimeWithinGrid('17:00', gridStart, gridEnd)).toBe(false);
    expect(isTimeWithinGrid('08:30', gridStart, gridEnd)).toBe(false);
  });

  it('formats the current time as HH:MM', () => {
    const label = currentTimeLabel(new Date('2026-07-07T14:35:00'));
    expect(label).toBe('14:35');
  });

  it('uses the shared 40px row height constant', () => {
    expect(CALENDAR_ROW_HEIGHT).toBe(40);
    expect(timeToPixelOffset('09:30', gridStart)).toBe(40);
  });
});
