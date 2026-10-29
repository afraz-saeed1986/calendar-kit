import { describe, expect, it, vi } from 'vitest';
import { createCalendar, createDate, type CalendarOptions, type KeyEventLike } from '../src';

/** Wednesday, 14 October 2026. */
const base: CalendarOptions = {
  now: () => new Date('2026-10-14T10:00:00Z'),
  timeZone: 'UTC',
  locale: 'en-US',
};

const day = (year: number, month: number, d: number) => createDate('gregory', year, month, d);

/** A fake keyboard event that records whether preventDefault was called. */
function key(name: string, extra: Partial<KeyEventLike> = {}) {
  const preventDefault = vi.fn();
  return { event: { key: name, preventDefault, ...extra } as KeyEventLike, preventDefault };
}

function press(calendar: ReturnType<typeof createCalendar>, name: string, extra = {}) {
  const { event, preventDefault } = key(name, extra);
  const handled = calendar.handleKeyDown(event);
  return { handled, prevented: preventDefault.mock.calls.length > 0 };
}

const focused = (calendar: ReturnType<typeof createCalendar>) => {
  const { year, month, day: d } = calendar.getState().focusedDate;
  return [year, month, d];
};

describe('selection: uncontrolled', () => {
  it('starts empty and selects a day', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({ ...base, onChange });
    expect(calendar.getState().value).toBeNull();

    calendar.select(day(2026, 10, 20));

    const state = calendar.getState();
    expect(state.value).toMatchObject({ year: 2026, month: 10, day: 20 });
    expect(state.weeks.flat().filter((c) => c.isSelected)).toHaveLength(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ day: 20 }));
  });

  it('moves the focus to the selected day, even in another month', () => {
    const calendar = createCalendar({ ...base });
    calendar.select(day(2026, 11, 3));
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 11 });
  });

  it('starts from defaultValue, shown and selected', () => {
    const calendar = createCalendar({ ...base, defaultValue: day(2026, 3, 8) });
    const state = calendar.getState();
    expect(state.visibleMonth).toEqual({ year: 2026, month: 3 });
    expect(state.weeks.flat().find((c) => c.isSelected)!.date.day).toBe(8);
  });

  it('clear removes the selection and tells the listener once', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({ ...base, defaultValue: day(2026, 10, 5), onChange });
    calendar.clear();
    expect(calendar.getState().value).toBeNull();
    expect(onChange).toHaveBeenCalledWith(null);

    calendar.clear(); // nothing left to clear
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores disabled and unavailable days', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({
      ...base,
      onChange,
      minDate: day(2026, 10, 10),
      isDateUnavailable: (date) => date.day === 20,
    });
    calendar.select(day(2026, 10, 9)); // before minDate
    calendar.select(day(2026, 10, 20)); // unavailable
    expect(calendar.getState().value).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    calendar.select(day(2026, 10, 10));
    expect(calendar.getState().value).toMatchObject({ day: 10 });
  });
});

describe('selection: controlled', () => {
  it('reports the choice but keeps the value until the parent passes a new one', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({ ...base, value: day(2026, 10, 1), onChange });

    calendar.select(day(2026, 10, 25));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ day: 25 }));
    expect(calendar.getState().value).toMatchObject({ day: 1 });

    calendar.setOptions({ value: day(2026, 10, 25) });
    expect(calendar.getState().value).toMatchObject({ day: 25 });
  });

  it('treats null as a controlled empty value', () => {
    const calendar = createCalendar({ ...base, value: null });
    calendar.select(day(2026, 10, 25));
    expect(calendar.getState().value).toBeNull();
  });

  it('shows a new value, but an unchanged value does not pull the user back', () => {
    const calendar = createCalendar({ ...base, value: day(2026, 10, 14) });

    calendar.setOptions({ value: day(2026, 1, 5) });
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 1 });

    calendar.nextMonth();
    // Same day, new object: what an adapter does on every render.
    calendar.setOptions({ value: day(2026, 1, 5) });
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 2 });
  });
});

describe('setOptions', () => {
  it('does nothing when no option changed', () => {
    const calendar = createCalendar({ ...base });
    const listener = vi.fn();
    calendar.subscribe(listener);
    const before = calendar.getState();

    calendar.setOptions({ locale: 'en-US', timeZone: 'UTC' });

    expect(listener).not.toHaveBeenCalled();
    expect(calendar.getState()).toBe(before);
  });
});

describe('keyboard navigation', () => {
  it('moves by day and week with the arrow keys', () => {
    const calendar = createCalendar({ ...base });
    expect(press(calendar, 'ArrowRight')).toEqual({ handled: true, prevented: true });
    expect(focused(calendar)).toEqual([2026, 10, 15]);
    press(calendar, 'ArrowLeft');
    press(calendar, 'ArrowLeft');
    expect(focused(calendar)).toEqual([2026, 10, 13]);
    press(calendar, 'ArrowDown');
    expect(focused(calendar)).toEqual([2026, 10, 20]);
    press(calendar, 'ArrowUp');
    press(calendar, 'ArrowUp');
    expect(focused(calendar)).toEqual([2026, 10, 6]);
  });

  it('crosses month boundaries with the arrow keys', () => {
    const calendar = createCalendar({ ...base, focusedDate: day(2026, 10, 31) });
    press(calendar, 'ArrowRight');
    expect(focused(calendar)).toEqual([2026, 11, 1]);
    press(calendar, 'ArrowLeft');
    expect(focused(calendar)).toEqual([2026, 10, 31]);
  });

  it('reverses left and right in right-to-left languages', () => {
    const calendar = createCalendar({ ...base, direction: 'rtl' });
    press(calendar, 'ArrowRight');
    expect(focused(calendar)).toEqual([2026, 10, 13]);
    press(calendar, 'ArrowLeft');
    press(calendar, 'ArrowLeft');
    expect(focused(calendar)).toEqual([2026, 10, 15]);
  });

  it('Home and End go to the start and end of the week', () => {
    const calendar = createCalendar({ ...base, weekStart: 0 }); // Wednesday 14th, Sunday start
    press(calendar, 'Home');
    expect(focused(calendar)).toEqual([2026, 10, 11]);
    press(calendar, 'End');
    expect(focused(calendar)).toEqual([2026, 10, 17]);

    const monday = createCalendar({ ...base, weekStart: 1 });
    press(monday, 'Home');
    expect(focused(monday)).toEqual([2026, 10, 12]);
    press(monday, 'End');
    expect(focused(monday)).toEqual([2026, 10, 18]);
  });

  it('PageUp and PageDown change the month, with Shift the year', () => {
    const calendar = createCalendar({ ...base });
    press(calendar, 'PageDown');
    expect(focused(calendar)).toEqual([2026, 11, 14]);
    press(calendar, 'PageUp');
    press(calendar, 'PageUp');
    expect(focused(calendar)).toEqual([2026, 9, 14]);
    press(calendar, 'PageDown', { shiftKey: true });
    expect(focused(calendar)).toEqual([2027, 9, 14]);
    press(calendar, 'PageUp', { shiftKey: true });
    expect(focused(calendar)).toEqual([2026, 9, 14]);
  });

  it('clamps the day when the month is shorter', () => {
    const calendar = createCalendar({ ...base, focusedDate: day(2026, 1, 31) });
    press(calendar, 'PageDown');
    expect(focused(calendar)).toEqual([2026, 2, 28]);
  });

  it('Enter and Space select the focused day', () => {
    const calendar = createCalendar({ ...base });
    expect(press(calendar, 'Enter')).toEqual({ handled: true, prevented: true });
    expect(calendar.getState().value).toMatchObject({ day: 14 });

    press(calendar, 'ArrowRight');
    press(calendar, ' ');
    expect(calendar.getState().value).toMatchObject({ day: 15 });
  });

  it('leaves other keys and shortcuts alone', () => {
    const calendar = createCalendar({ ...base });
    expect(press(calendar, 'a')).toEqual({ handled: false, prevented: false });
    expect(press(calendar, 'Tab')).toEqual({ handled: false, prevented: false });
    expect(press(calendar, 'ArrowRight', { ctrlKey: true })).toEqual({
      handled: false,
      prevented: false,
    });
    expect(press(calendar, 'ArrowRight', { metaKey: true }).handled).toBe(false);
    expect(press(calendar, 'ArrowRight', { altKey: true }).handled).toBe(false);
    expect(focused(calendar)).toEqual([2026, 10, 14]);
  });
});

describe('prop getters', () => {
  it('describes a day for assistive technology', () => {
    const calendar = createCalendar({ ...base });
    const { attrs } = calendar.getDayProps(day(2026, 10, 14));

    expect(attrs).toMatchObject({
      role: 'gridcell',
      tabindex: 0,
      'aria-selected': false,
      'aria-current': 'date',
      'aria-label': 'Wednesday, October 14, 2026',
      'data-today': true,
      'data-focused': true,
    });
    expect(attrs['aria-disabled']).toBeUndefined();
  });

  it('puts only the focused day in the tab order', () => {
    const calendar = createCalendar({ ...base });
    expect(calendar.getDayProps(day(2026, 10, 14)).attrs.tabindex).toBe(0);
    expect(calendar.getDayProps(day(2026, 10, 15)).attrs.tabindex).toBe(-1);
  });

  it('reflects selection, disabled days and days outside the month', () => {
    const calendar = createCalendar({
      ...base,
      defaultValue: day(2026, 10, 20),
      maxDate: day(2026, 10, 25),
    });
    expect(calendar.getDayProps(day(2026, 10, 20)).attrs).toMatchObject({
      'aria-selected': true,
      'data-selected': true,
    });
    expect(calendar.getDayProps(day(2026, 10, 26)).attrs).toMatchObject({
      'aria-disabled': true,
      'data-disabled': true,
    });
    expect(calendar.getDayProps(day(2026, 9, 28)).attrs['data-outside-month']).toBe(true);
  });

  it('click selects the day', () => {
    const calendar = createCalendar({ ...base });
    calendar.getDayProps(day(2026, 10, 22)).handlers.click();
    expect(calendar.getState().value).toMatchObject({ day: 22 });
  });

  it('the grid keydown handler drives the keyboard navigation', () => {
    const calendar = createCalendar({ ...base });
    const { attrs, handlers } = calendar.getGridProps();
    expect(attrs).toMatchObject({ role: 'grid', 'aria-label': 'October 2026' });

    handlers.keydown(key('ArrowDown').event);
    expect(focused(calendar)).toEqual([2026, 10, 21]);
  });

  it('describes the root and the month buttons', () => {
    const calendar = createCalendar({ ...base });
    expect(calendar.getRootProps().attrs).toMatchObject({
      role: 'group',
      'aria-label': 'October 2026',
      dir: 'ltr',
    });

    const prev = calendar.getPrevButtonProps();
    const next = calendar.getNextButtonProps();
    expect(prev.attrs).toMatchObject({ type: 'button', 'aria-label': 'Previous month' });
    expect(next.attrs).toMatchObject({ type: 'button', 'aria-label': 'Next month' });

    next.handlers.click();
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 11 });
    prev.handlers.click();
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 10 });
  });

  it('translates button texts by locale and allows overrides', () => {
    const persian = createCalendar({ ...base, locale: 'fa-IR' });
    expect(persian.getPrevButtonProps().attrs['aria-label']).toBe('ماه قبل');
    expect(persian.getNextButtonProps().attrs['aria-label']).toBe('ماه بعد');
    expect(persian.getRootProps().attrs.dir).toBe('rtl');

    const german = createCalendar({ ...base, locale: 'de-DE' });
    expect(german.getNextButtonProps().attrs['aria-label']).toBe('Nächster Monat');

    const custom = createCalendar({ ...base, labels: { nextMonth: 'Forward' } });
    expect(custom.getNextButtonProps().attrs['aria-label']).toBe('Forward');
    expect(custom.getPrevButtonProps().attrs['aria-label']).toBe('Previous month');
  });
});
