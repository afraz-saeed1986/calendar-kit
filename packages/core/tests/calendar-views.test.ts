import { describe, expect, it, vi } from 'vitest';
import { createCalendar } from '../src';
import type { CalendarDate, CalendarOptions } from '../src';

const day = (year: number, month: number, d: number): CalendarDate => ({
  system: 'gregory',
  year,
  month,
  day: d,
});

/** A calendar whose "today" is 14 October 2026. */
function make(options: CalendarOptions = {}) {
  return createCalendar({
    locale: 'en-US',
    now: () => new Date('2026-10-14T12:00:00Z'),
    ...options,
  });
}

/** Press a key and report whether the calendar called preventDefault. */
function press(calendar: ReturnType<typeof make>, key: string): boolean {
  const preventDefault = vi.fn();
  calendar.handleKeyDown({ key, preventDefault });
  return preventDefault.mock.calls.length > 0;
}

describe('views: state', () => {
  it('starts on the days and describes the month and the year', () => {
    const state = make().getState();
    expect(state.view).toBe('days');
    expect(state.monthName).toBe('October');
    expect(state.yearLabel).toBe('2026');
    expect(state.yearsLabel).toBe('2020 – 2029');
  });

  it('lists 12 months and marks the current and focused one', () => {
    const { months } = make().getState();
    expect(months).toHaveLength(12);
    const october = months[9];
    expect(october?.month).toBe(10);
    expect(october?.label).toBe('October');
    expect(october?.isCurrent).toBe(true);
    expect(october?.isFocused).toBe(true);
    expect(months[0]?.isCurrent).toBe(false);
  });

  it('lists a page of 12 years: the decade plus one year on each side', () => {
    const { years } = make().getState();
    expect(years.map((y) => y.year)).toEqual([
      2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030,
    ]);
    expect(years.filter((y) => y.isOutsideDecade).map((y) => y.year)).toEqual([2019, 2030]);
    expect(years.find((y) => y.year === 2026)?.isCurrent).toBe(true);
    expect(years.find((y) => y.year === 2026)?.isFocused).toBe(true);
  });

  it('marks the selected month and year', () => {
    const state = make({ defaultValue: day(2026, 3, 5) }).getState();
    expect(state.months[2]?.isSelected).toBe(true);
    expect(state.months[9]?.isSelected).toBe(false);
    expect(state.years.find((y) => y.year === 2026)?.isSelected).toBe(true);
  });
});

describe('views: switching', () => {
  it('setView changes the state and notifies once', () => {
    const calendar = make();
    const listener = vi.fn();
    calendar.subscribe(listener);

    calendar.setView('months');
    expect(calendar.getState().view).toBe('months');
    expect(listener).toHaveBeenCalledTimes(1);

    calendar.setView('months');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('the month and year buttons open and close their grid', () => {
    const calendar = make();
    expect(calendar.getMonthButtonProps().attrs['aria-expanded']).toBe(false);

    calendar.getMonthButtonProps().handlers.click();
    expect(calendar.getState().view).toBe('months');
    expect(calendar.getMonthButtonProps().attrs['aria-expanded']).toBe(true);

    calendar.getYearButtonProps().handlers.click();
    expect(calendar.getState().view).toBe('years');
    expect(calendar.getMonthButtonProps().attrs['aria-expanded']).toBe(false);
    expect(calendar.getYearButtonProps().attrs['aria-expanded']).toBe(true);

    calendar.getYearButtonProps().handlers.click();
    expect(calendar.getState().view).toBe('days');
  });

  it('names the buttons with their text and the action', () => {
    const calendar = make({ labels: { chooseYear: 'Pick a year' } });
    expect(calendar.getMonthButtonProps().attrs['aria-label']).toContain('October');
    expect(calendar.getYearButtonProps().attrs['aria-label']).toBe('2026, Pick a year');
  });

  it('labels the grid for the active view', () => {
    const calendar = make();
    calendar.setView('months');
    expect(calendar.getGridProps().attrs['aria-label']).toBe('2026');
    calendar.setView('years');
    expect(calendar.getGridProps().attrs['aria-label']).toBe('2020 – 2029');
  });
});

describe('views: choosing', () => {
  it('chooseMonth goes back to the days and clamps the day', () => {
    const calendar = make({ focusedDate: day(2026, 1, 31) });
    calendar.setView('months');
    calendar.chooseMonth(2);

    const state = calendar.getState();
    expect(state.view).toBe('days');
    expect(state.focusedDate).toMatchObject({ year: 2026, month: 2, day: 28 });
  });

  it('chooseYear goes back to the days and clamps the day', () => {
    const calendar = make({ focusedDate: day(2024, 2, 29) });
    calendar.setView('years');
    calendar.chooseYear(2025);

    const state = calendar.getState();
    expect(state.view).toBe('days');
    expect(state.focusedDate).toMatchObject({ year: 2025, month: 2, day: 28 });
  });

  it('does not change the selected value', () => {
    const onChange = vi.fn();
    const calendar = make({ defaultValue: day(2026, 3, 5), onChange });
    calendar.chooseYear(2030);
    expect(onChange).not.toHaveBeenCalled();
    expect(calendar.getState().value).toMatchObject({ year: 2026, month: 3, day: 5 });
  });

  it('reports the new focus', () => {
    const onFocusedDateChange = vi.fn();
    const calendar = make({ onFocusedDateChange });
    calendar.chooseYear(2030);
    expect(onFocusedDateChange).toHaveBeenCalledTimes(1);
  });

  it('ignores a month that does not exist', () => {
    const calendar = make();
    calendar.setView('months');
    calendar.chooseMonth(13);
    expect(calendar.getState().view).toBe('months');
  });

  it('the cells choose on click', () => {
    const calendar = make();
    calendar.setView('months');
    calendar.getMonthProps(2).handlers.click();
    expect(calendar.getState().focusedDate).toMatchObject({ month: 2 });

    calendar.setView('years');
    calendar.getYearProps(2021).handlers.click();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2021 });
  });
});

describe('views: minDate and maxDate', () => {
  it('disables months and years outside the range and refuses to choose them', () => {
    const calendar = make({ minDate: day(2026, 6, 10), maxDate: day(2027, 3, 1) });
    const { months, years } = calendar.getState();

    expect(months[4]?.isDisabled).toBe(true); // May 2026
    expect(months[5]?.isDisabled).toBe(false); // June 2026, it still has days in range
    expect(years.find((y) => y.year === 2025)?.isDisabled).toBe(true);
    expect(years.find((y) => y.year === 2027)?.isDisabled).toBe(false);
    expect(years.find((y) => y.year === 2028)?.isDisabled).toBe(true);

    calendar.setView('months');
    calendar.chooseMonth(5);
    expect(calendar.getState().view).toBe('months');

    calendar.setView('years');
    calendar.chooseYear(2025);
    expect(calendar.getState().view).toBe('years');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026, month: 10 });
  });

  it('marks disabled cells in their props', () => {
    const calendar = make({ minDate: day(2026, 6, 10) });
    expect(calendar.getMonthProps(5).attrs['aria-disabled']).toBe(true);
    expect(calendar.getMonthProps(6).attrs['aria-disabled']).toBeUndefined();
  });
});

describe('views: previous and next buttons', () => {
  it('move by a month, a year or ten years depending on the view', () => {
    const calendar = make();

    calendar.getNextButtonProps().handlers.click();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026, month: 11 });

    calendar.setView('months');
    calendar.getNextButtonProps().handlers.click();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2027, month: 11 });

    calendar.setView('years');
    calendar.getNextButtonProps().handlers.click();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2037 });
    calendar.getPrevButtonProps().handlers.click();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2027 });
  });

  it('change their accessible name with the view', () => {
    const calendar = make();
    const names = new Set<unknown>();
    names.add(calendar.getNextButtonProps().attrs['aria-label']);
    calendar.setView('months');
    names.add(calendar.getNextButtonProps().attrs['aria-label']);
    calendar.setView('years');
    names.add(calendar.getNextButtonProps().attrs['aria-label']);
    expect(names.size).toBe(3);
  });
});

describe('views: keyboard in the months', () => {
  it('moves by one month and by one row', () => {
    const calendar = make();
    calendar.setView('months');

    expect(press(calendar, 'ArrowLeft')).toBe(true);
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026, month: 9 });

    press(calendar, 'ArrowUp');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026, month: 6 });

    press(calendar, 'ArrowDown');
    press(calendar, 'ArrowDown');
    press(calendar, 'ArrowDown');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2027, month: 3 });
  });

  it('reverses left and right in a right-to-left calendar', () => {
    const calendar = make({ direction: 'rtl' });
    calendar.setView('months');
    press(calendar, 'ArrowRight');
    expect(calendar.getState().focusedDate).toMatchObject({ month: 9 });
  });

  it('jumps a year with PageUp and PageDown and to the ends with Home and End', () => {
    const calendar = make();
    calendar.setView('months');

    press(calendar, 'PageDown');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2027, month: 10 });
    press(calendar, 'PageUp');
    press(calendar, 'PageUp');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2025, month: 10 });

    press(calendar, 'Home');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2025, month: 1 });
    press(calendar, 'End');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2025, month: 12 });
  });

  it('Enter chooses the focused month and returns to the days', () => {
    const calendar = make();
    calendar.setView('months');
    press(calendar, 'ArrowLeft');
    expect(press(calendar, 'Enter')).toBe(true);
    expect(calendar.getState().view).toBe('days');
    expect(calendar.getState().focusedDate).toMatchObject({ month: 9 });
  });

  it('Escape returns to the days without changing the focus', () => {
    const calendar = make();
    calendar.setView('months');
    expect(press(calendar, 'Escape')).toBe(true);
    expect(calendar.getState().view).toBe('days');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026, month: 10, day: 14 });
  });
});

describe('views: keyboard in the years', () => {
  it('moves by one year and by one row', () => {
    const calendar = make();
    calendar.setView('years');
    press(calendar, 'ArrowRight');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2027 });
    press(calendar, 'ArrowDown');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2030 });
    expect(calendar.getState().years[0]?.year).toBe(2029);
  });

  it('PageDown and PageUp move by ten years, Home and End to the ends of the decade', () => {
    const calendar = make();
    calendar.setView('years');

    press(calendar, 'PageDown');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2036 });
    press(calendar, 'Home');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2030 });
    press(calendar, 'End');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2039 });
    press(calendar, 'PageUp');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2029 });
  });

  it('Enter chooses the focused year and returns to the days', () => {
    const calendar = make();
    calendar.setView('years');
    press(calendar, 'ArrowLeft');
    press(calendar, 'Enter');
    expect(calendar.getState().view).toBe('days');
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2025 });
  });

  it('leaves shortcuts with a modifier key alone', () => {
    const calendar = make();
    calendar.setView('years');
    const preventDefault = vi.fn();
    calendar.handleKeyDown({ key: 'ArrowRight', ctrlKey: true, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2026 });
  });
});

describe('views: props of the cells', () => {
  it('only the focused month and year are in the tab order', () => {
    const calendar = make({ defaultValue: day(2026, 3, 5) });
    expect(calendar.getMonthProps(3).attrs.tabindex).toBe(0);
    expect(calendar.getMonthProps(3).attrs['aria-selected']).toBe(true);
    expect(calendar.getMonthProps(10).attrs.tabindex).toBe(-1);
    expect(calendar.getMonthProps(10).attrs['aria-selected']).toBe(false);
    expect(calendar.getYearProps(2026).attrs.tabindex).toBe(0);
    expect(calendar.getYearProps(2027).attrs.tabindex).toBe(-1);
    expect(calendar.getYearProps(2019).attrs['data-outside-decade']).toBe(true);
  });

  it('throws for a month or year that is not shown', () => {
    const calendar = make();
    expect(() => calendar.getMonthProps(13)).toThrow(RangeError);
    expect(() => calendar.getYearProps(1999)).toThrow(RangeError);
  });
});
