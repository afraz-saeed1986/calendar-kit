import { describe, expect, it, vi } from 'vitest';
import {
  addMonths,
  addYears,
  createCalendar,
  createDate,
  dayOfWeek,
  type CalendarOptions,
} from '../src';

/** Wednesday, 14 October 2026. A fixed clock keeps every test repeatable. */
const NOW = () => new Date('2026-10-14T10:00:00Z');
const base: CalendarOptions = { now: NOW, timeZone: 'UTC' };

const ymd = (cell: { date: { year: number; month: number; day: number } }) =>
  [cell.date.year, cell.date.month, cell.date.day] as const;

describe('createCalendar: month grid', () => {
  it('builds October 2026 with Sunday as the first day', () => {
    const state = createCalendar({ ...base, locale: 'en-US' }).getState();

    expect(state.monthLabel).toBe('October 2026');
    expect(state.visibleMonth).toEqual({ year: 2026, month: 10 });
    expect(state.weeks).toHaveLength(6);
    state.weeks.forEach((week) => expect(week).toHaveLength(7));

    // 1 October 2026 is a Thursday, so the grid starts on Sunday 27 September.
    expect(ymd(state.weeks[0]![0]!)).toEqual([2026, 9, 27]);
    expect(ymd(state.weeks[5]![6]!)).toEqual([2026, 11, 7]);
    expect(state.weekdayLabels.map((d) => d.short)).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
  });

  it('marks today, the focused day and days outside the month', () => {
    const cells = createCalendar({ ...base })
      .getState()
      .weeks.flat();
    const today = cells.filter((c) => c.isToday);
    const focused = cells.filter((c) => c.isFocused);

    expect(today.map(ymd)).toEqual([[2026, 10, 14]]);
    expect(focused.map(ymd)).toEqual([[2026, 10, 14]]);
    expect(cells.filter((c) => !c.isOutsideMonth)).toHaveLength(31);
    expect(cells[0]!.isOutsideMonth).toBe(true);
  });

  it('honours an explicit weekStart', () => {
    const state = createCalendar({ ...base, weekStart: 1 }).getState();
    expect(ymd(state.weeks[0]![0]!)).toEqual([2026, 9, 28]);
    expect(state.weekdayLabels[0]!.short).toBe('Mon');
    expect(state.weekdayLabels[6]!.short).toBe('Sun');
  });

  it('derives week start, names and direction from the locale', () => {
    const german = createCalendar({ ...base, locale: 'de-DE' }).getState();
    expect(german.weekStart).toBe(1);
    expect(german.monthLabel).toBe('Oktober 2026');
    expect(german.direction).toBe('ltr');

    const persianLocale = createCalendar({ ...base, locale: 'fa-IR' }).getState();
    expect(persianLocale.weekStart).toBe(6);
    expect(persianLocale.direction).toBe('rtl');
  });

  it('formats day numbers with the locale numerals', () => {
    const cells = createCalendar({ ...base, locale: 'fa-IR' })
      .getState()
      .weeks.flat();
    expect(cells.find((c) => c.isToday)!.label).toBe('۱۴');
  });
});

describe('createCalendar: today and time zones', () => {
  it('decides "today" in the configured time zone', () => {
    // 21:00 UTC is already 00:30 on 15 October in Tehran.
    const options = { now: () => new Date('2026-10-14T21:00:00Z') };
    const utc = createCalendar({ ...options, timeZone: 'UTC' }).getState();
    const tehran = createCalendar({ ...options, timeZone: 'Asia/Tehran' }).getState();

    expect(utc.weeks.flat().find((c) => c.isToday)!.date.day).toBe(14);
    expect(tehran.weeks.flat().find((c) => c.isToday)!.date.day).toBe(15);
  });
});

describe('createCalendar: navigation', () => {
  it('moves between months and years', () => {
    const calendar = createCalendar({ ...base, locale: 'en-US' });

    calendar.nextMonth();
    expect(calendar.getState().monthLabel).toBe('November 2026');
    calendar.prevMonth();
    calendar.prevMonth();
    expect(calendar.getState().monthLabel).toBe('September 2026');
    calendar.nextYear();
    expect(calendar.getState().monthLabel).toBe('September 2027');
    calendar.prevYear();
    expect(calendar.getState().monthLabel).toBe('September 2026');
  });

  it('crosses year boundaries', () => {
    const calendar = createCalendar({ ...base, focusedDate: createDate('gregory', 2026, 12, 15) });
    calendar.nextMonth();
    expect(calendar.getState().visibleMonth).toEqual({ year: 2027, month: 1 });
    calendar.prevMonth();
    calendar.prevMonth();
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 11 });
  });

  it('clamps the focused day to the length of the target month', () => {
    const calendar = createCalendar({ ...base, focusedDate: createDate('gregory', 2026, 1, 31) });
    calendar.nextMonth();
    expect(calendar.getState().focusedDate).toMatchObject({ month: 2, day: 28 });
  });

  it('goTo and goToToday move the focus', () => {
    const calendar = createCalendar({ ...base });
    calendar.goTo(createDate('gregory', 2024, 2, 29));
    expect(calendar.getState().visibleMonth).toEqual({ year: 2024, month: 2 });
    calendar.goToToday();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026, month: 10, day: 14 });
  });

  it('calls onFocusedDateChange', () => {
    const onFocusedDateChange = vi.fn();
    const calendar = createCalendar({ ...base, onFocusedDateChange });
    calendar.nextMonth();
    expect(onFocusedDateChange).toHaveBeenCalledTimes(1);
    expect(onFocusedDateChange).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 11, day: 14 }),
    );
  });
});

describe('createCalendar: store contract', () => {
  it('returns the same state object until something changes', () => {
    const calendar = createCalendar({ ...base });
    expect(calendar.getState()).toBe(calendar.getState());

    const before = calendar.getState();
    calendar.nextMonth();
    expect(calendar.getState()).not.toBe(before);
  });

  it('notifies subscribers once per change and stops after unsubscribe', () => {
    const calendar = createCalendar({ ...base });
    const listener = vi.fn();
    const unsubscribe = calendar.subscribe(listener);

    calendar.nextMonth();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    calendar.nextMonth();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('setOptions rebuilds the state', () => {
    const calendar = createCalendar({ ...base, locale: 'en-US' });
    calendar.setOptions({ locale: 'de-DE' });
    expect(calendar.getState().monthLabel).toBe('Oktober 2026');
  });

  it('destroy removes all listeners', () => {
    const calendar = createCalendar({ ...base });
    const listener = vi.fn();
    calendar.subscribe(listener);
    calendar.destroy();
    calendar.nextMonth();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createCalendar: limits and plugins', () => {
  it('disables days outside minDate and maxDate', () => {
    const state = createCalendar({
      ...base,
      minDate: createDate('gregory', 2026, 10, 10),
      maxDate: createDate('gregory', 2026, 10, 20),
    }).getState();

    const disabled = (day: number) =>
      state.weeks.flat().find((c) => !c.isOutsideMonth && c.date.day === day)!.isDisabled;
    expect(disabled(9)).toBe(true);
    expect(disabled(10)).toBe(false);
    expect(disabled(20)).toBe(false);
    expect(disabled(21)).toBe(true);
  });

  it('marks days unavailable through the option', () => {
    const state = createCalendar({
      ...base,
      isDateUnavailable: (date) => date.day === 1,
    }).getState();
    const unavailable = state.weeks.flat().filter((c) => c.isUnavailable);
    expect(unavailable.every((c) => c.date.day === 1)).toBe(true);
    expect(unavailable.length).toBeGreaterThan(0);
  });

  it('lets plugins decorate days and mark them unavailable', () => {
    const state = createCalendar({
      ...base,
      plugins: [
        {
          name: 'test-holidays',
          decorateDay: (date) => (date.day === 14 ? { holiday: 'Test day' } : undefined),
          isDateUnavailable: (date) => date.day === 14,
        },
      ],
    }).getState();

    const cell = state.weeks.flat().find((c) => !c.isOutsideMonth && c.date.day === 14)!;
    expect(cell.meta).toEqual({ holiday: 'Test day' });
    expect(cell.isUnavailable).toBe(true);
  });

  it('fails loudly for an unknown calendar system', () => {
    expect(() => createCalendar({ system: 'persian' })).toThrow(/Unknown calendar system/);
  });
});

describe('date helpers used by the calendar', () => {
  it('dayOfWeek returns 0 for Sunday', () => {
    expect(dayOfWeek(createDate('gregory', 2026, 10, 14))).toBe(3); // Wednesday
    expect(dayOfWeek(createDate('gregory', 2026, 10, 11))).toBe(0); // Sunday
    expect(dayOfWeek(createDate('gregory', 1970, 1, 1))).toBe(4); // Thursday
  });

  it('addMonths clamps the day and crosses years in both directions', () => {
    expect(addMonths(createDate('gregory', 2026, 1, 31), 1)).toMatchObject({ month: 2, day: 28 });
    expect(addMonths(createDate('gregory', 2024, 1, 31), 1)).toMatchObject({ month: 2, day: 29 });
    expect(addMonths(createDate('gregory', 2026, 11, 15), 3)).toMatchObject({
      year: 2027,
      month: 2,
    });
    expect(addMonths(createDate('gregory', 2026, 2, 15), -3)).toMatchObject({
      year: 2025,
      month: 11,
    });
    expect(addMonths(createDate('gregory', 2026, 5, 10), 0)).toMatchObject({ month: 5, day: 10 });
  });

  it('addYears clamps 29 February', () => {
    expect(addYears(createDate('gregory', 2024, 2, 29), 1)).toMatchObject({
      year: 2025,
      month: 2,
      day: 28,
    });
    expect(addYears(createDate('gregory', 2024, 2, 29), 4)).toMatchObject({ year: 2028, day: 29 });
  });
});
