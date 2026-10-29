import {
  createCalendar,
  createDate,
  type CalendarOptions,
  type KeyEventLike,
} from '@calendrix/core';
import { describe, expect, it, vi } from 'vitest';
import { persianPlugin } from '../src';

/** Wednesday, 14 October 2026, which is 22 Mehr 1405. */
const options: CalendarOptions = {
  system: 'persian',
  locale: 'fa-IR',
  plugins: [persianPlugin],
  now: () => new Date('2026-10-14T10:00:00Z'),
  timeZone: 'UTC',
};

const press = (calendar: ReturnType<typeof createCalendar>, key: string, shiftKey = false) =>
  calendar.handleKeyDown({ key, shiftKey, preventDefault: vi.fn() } as KeyEventLike);

const focused = (calendar: ReturnType<typeof createCalendar>) => {
  const { year, month, day } = calendar.getState().focusedDate;
  return [year, month, day];
};

describe('persian calendar: keyboard', () => {
  it('moves left to the next day, because Persian is right to left', () => {
    const calendar = createCalendar(options);
    press(calendar, 'ArrowLeft');
    expect(focused(calendar)).toEqual([1405, 7, 23]);
    press(calendar, 'ArrowRight');
    press(calendar, 'ArrowRight');
    expect(focused(calendar)).toEqual([1405, 7, 21]);
  });

  it('Home and End use a Saturday to Friday week', () => {
    const calendar = createCalendar(options);
    press(calendar, 'Home');
    expect(focused(calendar)).toEqual([1405, 7, 18]); // Saturday 10 October
    press(calendar, 'End');
    expect(focused(calendar)).toEqual([1405, 7, 24]); // Friday 16 October
  });

  it('clamps the day when moving to a month with fewer days', () => {
    const calendar = createCalendar({
      ...options,
      focusedDate: createDate('persian', 1405, 6, 31),
    });
    press(calendar, 'PageDown'); // Mehr has 30 days
    expect(focused(calendar)).toEqual([1405, 7, 30]);
  });

  it('Shift+PageDown moves a year and clamps Esfand 30', () => {
    const calendar = createCalendar({
      ...options,
      focusedDate: createDate('persian', 1403, 12, 30),
    });
    press(calendar, 'PageDown', true);
    expect(focused(calendar)).toEqual([1404, 12, 29]);
  });
});

describe('persian calendar: selection and props', () => {
  it('selects a Persian date and reports it in the Persian system', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({ ...options, onChange });
    calendar.select(createDate('persian', 1405, 7, 25));

    expect(calendar.getState().value).toMatchObject({
      system: 'persian',
      year: 1405,
      month: 7,
      day: 25,
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ system: 'persian', day: 25 }));
  });

  it('accepts a Gregorian value and shows it in the Persian calendar', () => {
    const calendar = createCalendar({ ...options, value: createDate('gregory', 2026, 3, 21) });
    const state = calendar.getState();
    expect(state.value).toMatchObject({ system: 'persian', year: 1405, month: 1, day: 1 });
    expect(state.visibleMonth).toEqual({ year: 1405, month: 1 });
  });

  it('labels days in Persian', () => {
    const calendar = createCalendar(options);
    const label = calendar.getDayProps(createDate('persian', 1405, 7, 22)).attrs['aria-label'];
    expect(label).toContain('مهر');
    expect(label).toContain('۱۴۰۵');
    expect(label).toContain('۲۲');
    expect(label).toContain('چهارشنبه');
  });

  it('keeps the selected day when the calendar system changes', () => {
    const calendar = createCalendar({
      ...options,
      defaultValue: createDate('persian', 1405, 7, 22),
    });
    calendar.setOptions({ system: 'gregory', locale: 'en-US' });
    expect(calendar.getState().value).toMatchObject({
      system: 'gregory',
      year: 2026,
      month: 10,
      day: 14,
    });
  });
});
