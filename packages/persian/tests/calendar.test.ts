import { createCalendar, createDate, type CalendarOptions } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { persianPlugin } from '../src';

/** Wednesday, 14 October 2026, which is 22 Mehr 1405. */
const options: CalendarOptions = {
  system: 'persian',
  locale: 'fa-IR',
  plugins: [persianPlugin],
  now: () => new Date('2026-10-14T10:00:00Z'),
  timeZone: 'UTC',
};

describe('createCalendar with the Persian calendar', () => {
  it('builds Mehr 1405 starting on Saturday', () => {
    const state = createCalendar(options).getState();

    expect(state.visibleMonth).toEqual({ year: 1405, month: 7 });
    expect(state.monthLabel).toContain('مهر');
    expect(state.monthLabel).toContain('۱۴۰۵');
    expect(state.weekStart).toBe(6);
    expect(state.direction).toBe('rtl');
    expect(state.weekdayLabels[0]!.long).toBe('شنبه');

    // 1 Mehr 1405 is a Wednesday, so the grid starts on Saturday 28 Shahrivar.
    const first = state.weeks[0]![0]!;
    expect(first.date).toMatchObject({ system: 'persian', year: 1405, month: 6, day: 28 });
    expect(first.isOutsideMonth).toBe(true);
  });

  it('marks today and formats it with Persian numerals', () => {
    const today = createCalendar(options)
      .getState()
      .weeks.flat()
      .find((c) => c.isToday)!;
    expect(today.date).toMatchObject({ year: 1405, month: 7, day: 22 });
    expect(today.label).toBe('۲۲');
  });

  it('navigates across the year boundary in Esfand', () => {
    const calendar = createCalendar({
      ...options,
      focusedDate: createDate('persian', 1404, 12, 29),
    });
    calendar.nextMonth();
    expect(calendar.getState().visibleMonth).toEqual({ year: 1405, month: 1 });
    expect(calendar.getState().focusedDate).toMatchObject({ month: 1, day: 29 });
  });

  it('clamps Esfand 30 when moving to a common year', () => {
    const calendar = createCalendar({
      ...options,
      focusedDate: createDate('persian', 1403, 12, 30), // 1403 is a leap year
    });
    calendar.nextYear();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 1404, month: 12, day: 29 });
  });

  it('keeps the focused day when the system changes', () => {
    const calendar = createCalendar(options);
    calendar.setOptions({ system: 'gregory', locale: 'en-US' });

    const state = calendar.getState();
    expect(state.focusedDate).toMatchObject({ system: 'gregory', year: 2026, month: 10, day: 14 });
    expect(state.monthLabel).toBe('October 2026');
  });

  it('shows the Persian month for a Gregorian date passed to goTo', () => {
    const calendar = createCalendar(options);
    calendar.goTo(createDate('gregory', 2026, 3, 21)); // Nowruz 1405
    expect(calendar.getState().visibleMonth).toEqual({ year: 1405, month: 1 });
  });
});
