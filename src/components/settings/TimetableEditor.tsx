'use client';

import { useMemo } from 'react';
import {
  calculateWeeklyHours,
  generateTimeSlotOptions,
  TIMETABLE_DAYS,
  type TimetableDay,
  type TimetableInput,
} from '@/lib/utils/dates';

const DAY_LABELS: Record<TimetableDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export type TimetableEditorState = TimetableInput;

type TimetableEditorProps = {
  value: TimetableEditorState;
  onChange: (next: TimetableEditorState) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
};

function isWorkingDay(day: TimetableDay, value: TimetableEditorState): boolean {
  return Boolean(value[`${day}_start`] && value[`${day}_end`]);
}

export default function TimetableEditor({
  value,
  onChange,
  fieldErrors = {},
  disabled = false,
}: TimetableEditorProps) {
  const timeOptions = useMemo(() => generateTimeSlotOptions(), []);
  const weeklyHours = useMemo(() => calculateWeeklyHours(value), [value]);

  function setDay(day: TimetableDay, working: boolean, start?: string, end?: string) {
    const next = { ...value };

    if (!working) {
      next[`${day}_start`] = null;
      next[`${day}_end`] = null;
      onChange(next);
      return;
    }

    next[`${day}_start`] = start ?? value[`${day}_start`] ?? '09:00';
    next[`${day}_end`] = end ?? value[`${day}_end`] ?? '17:00';
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {TIMETABLE_DAYS.map((day) => {
        const working = isWorkingDay(day, value);
        const startField = `${day}_start`;
        const endField = `${day}_end`;
        const startError = fieldErrors[startField];
        const endError = fieldErrors[endField];

        return (
          <div
            key={day}
            className={`grid grid-cols-[7rem_1fr_auto] items-center gap-3 rounded-md border px-3 py-2 ${
              working ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <span className="text-sm font-medium text-slate-800">{DAY_LABELS[day]}</span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={working ? (value[`${day}_start`] ?? '09:00') : ''}
                disabled={disabled || !working}
                onChange={(event) => setDay(day, true, event.target.value, undefined)}
                className={`rounded-md border px-2 py-1.5 text-sm ${
                  startError ? 'border-red-500' : 'border-slate-300'
                } disabled:bg-slate-100`}
              >
                {!working && <option value="">—</option>}
                {timeOptions.map((slot) => (
                  <option key={`${day}-start-${slot}`} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">–</span>
              <select
                value={working ? (value[`${day}_end`] ?? '17:00') : ''}
                disabled={disabled || !working}
                onChange={(event) => setDay(day, true, undefined, event.target.value)}
                className={`rounded-md border px-2 py-1.5 text-sm ${
                  endError ? 'border-red-500' : 'border-slate-300'
                } disabled:bg-slate-100`}
              >
                {!working && <option value="">—</option>}
                {timeOptions.map((slot) => (
                  <option key={`${day}-end-${slot}`} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {(startError || endError) && (
                <p className="w-full text-xs text-red-600">{endError ?? startError}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={working}
                disabled={disabled}
                onChange={(event) => setDay(day, event.target.checked)}
              />
              Working day
            </label>
          </div>
        );
      })}

      <p className="text-sm text-slate-600">
        Total weekly hours: <span className="font-medium text-slate-900">{weeklyHours}</span>
      </p>
    </div>
  );
}
