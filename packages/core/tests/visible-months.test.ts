import { describe, expect, it, vi } from 'vitest';
import { createCalendar } from '../src';
import type { Calendar, CalendarDate, CalendarOptions } from '../src';

const d = (year: number, month: number, day: number): CalendarDate => ({
  system: 'gregory',
  year,
  month,
  day,
});

/** "Today" is 14 October 2026. */
const now = () => new Date('2026-10-14T12:00:00Z');

function make(options: CalendarOptions = {}) {
  return createCalendar({ locale: 'en-US', now, visibleMonths: 2, ...options });
}

function press(
  calendar: Pick<Calendar, 'handleKeyDown'>,
  key: string,
  extra: { shiftKey?: boolean } = {},
) {
  calendar.handleKeyDown({ key, preventDefault: vi.fn(), ...extra });
}

const labels = (calendar: Pick<Calendar, 'getState'>) =>
  calendar.getState().grids.map((grid) => grid.label);

/** A day in one of the visible months, with the flags of that month's grid. */
function cellIn(
  calendar: { getState(): Pick<ReturnType<Calendar['getState']>, 'grids'> },
  grid: number,
  month: number,
  day: number,
) {
  return calendar
    .getState()
    .grids[grid]?.weeks.flat()
    .find((cell) => cell.date.month === month && cell.date.day === day);
}

describe('visible months: state', () => {
  it('shows one month by default', () => {
    const calendar = make({ visibleMonths: undefined });
    const state = calendar.getState();
    expect(state.visibleMonths).toBe(1);
    expect(state.grids).toHaveLength(1);
    expect(state.visibleLabel).toBe('October 2026');
  });

  it('shows two months, the first one also in the older fields', () => {
    const state = make().getState();
    expect(state.visibleMonths).toBe(2);
    expect(state.grids.map((grid) => grid.label)).toEqual(['October 2026', 'November 2026']);
    expect(state.visibleLabel).toBe('October 2026 – November 2026');
    expect(state.monthLabel).toBe('October 2026');
    expect(state.weeks).toBe(state.grids[0]?.weeks);
    expect(state.visibleMonth).toEqual({ year: 2026, month: 10 });
  });

  it('clamps the number of months to 1..3', () => {
    expect(make({ visibleMonths: 5 }).getState().grids).toHaveLength(3);
    expect(make({ visibleMonths: 0 }).getState().grids).toHaveLength(1);
    expect(make({ visibleMonths: Number.NaN }).getState().grids).toHaveLength(1);
    expect(make({ visibleMonths: 2.7 }).getState().grids).toHaveLength(2);
  });

  it('marks the days outside a month relative to that month', () => {
    const calendar = make();
    // 1 November is a trailing day of the October grid and a real day of the November grid.
    expect(cellIn(calendar, 0, 11, 1)?.isOutsideMonth).toBe(true);
    expect(cellIn(calendar, 1, 11, 1)?.isOutsideMonth).toBe(false);
  });

  it('describes all the months in the group label and one in each grid', () => {
    const calendar = make();
    expect(calendar.getRootProps().attrs['aria-label']).toBe('October 2026 – November 2026');
    expect(calendar.getGridProps().attrs['aria-label']).toBe('October 2026');
    expect(calendar.getGridProps(1).attrs['aria-label']).toBe('November 2026');
    expect(calendar.getGridProps(5).attrs['aria-label']).toBe('October 2026');
  });
});

describe('visible months: moving', () => {
  it('the previous and next buttons move by one month and take the focus along', () => {
    const calendar = make();
    calendar.getNextButtonProps().handlers.click();
    expect(labels(calendar)).toEqual(['November 2026', 'December 2026']);
    expect(calendar.getState().focusedDate).toMatchObject({ month: 11, day: 14 });

    calendar.getPrevButtonProps().handlers.click();
    calendar.getPrevButtonProps().handlers.click();
    expect(labels(calendar)).toEqual(['September 2026', 'October 2026']);
  });

  it('the arrow keys move the visible months only when the focus leaves them', () => {
    const calendar = make({ focusedDate: d(2026, 10, 31) });
    press(calendar, 'ArrowRight');
    expect(calendar.getState().focusedDate).toMatchObject({ month: 11, day: 1 });
    expect(labels(calendar)).toEqual(['October 2026', 'November 2026']);

    const later = make({ focusedDate: d(2026, 11, 30) });
    press(later, 'ArrowRight');
    expect(later.getState().focusedDate).toMatchObject({ month: 12, day: 1 });
    expect(labels(later)).toEqual(['November 2026', 'December 2026']);
  });

  it('moves back when the focus goes before the first month', () => {
    const calendar = make({ focusedDate: d(2026, 10, 1) });
    press(calendar, 'ArrowLeft');
    expect(calendar.getState().focusedDate).toMatchObject({ month: 9, day: 30 });
    expect(labels(calendar)).toEqual(['September 2026', 'October 2026']);
  });

  it('PageDown moves by one month and Shift+PageDown by a year', () => {
    const calendar = make();
    press(calendar, 'PageDown');
    expect(labels(calendar)).toEqual(['November 2026', 'December 2026']);
    expect(calendar.getState().focusedDate).toMatchObject({ month: 11, day: 14 });

    press(calendar, 'PageDown', { shiftKey: true });
    expect(calendar.getState().focusedDate).toMatchObject({ year: 2027, month: 11 });
    expect(labels(calendar).at(-1)).toBe('November 2027');
  });

  it('goTo and goToToday show the month first', () => {
    const calendar = make();
    calendar.goTo(d(2026, 12, 5));
    expect(labels(calendar)).toEqual(['December 2026', 'January 2027']);
    calendar.goToToday();
    expect(labels(calendar)).toEqual(['October 2026', 'November 2026']);
  });

  it('selecting a day in the second month does not move the months', () => {
    const calendar = make();
    calendar.select(d(2026, 11, 5));
    const state = calendar.getState();
    expect(state.visibleMonth).toEqual({ year: 2026, month: 10 });
    expect(state.focusedDate).toMatchObject({ month: 11, day: 5 });
    expect(state.value).toMatchObject({ month: 11, day: 5 });
  });
});

describe('visible months: options and views', () => {
  it('keeps the focused day visible when fewer months are shown', () => {
    const calendar = make();
    calendar.select(d(2026, 11, 5));
    calendar.setOptions({ visibleMonths: 1 });
    expect(labels(calendar)).toEqual(['November 2026']);
  });

  it('the months view works on the first visible month', () => {
    const calendar = make({ focusedDate: d(2026, 10, 31) });
    press(calendar, 'ArrowRight');
    calendar.setView('months');
    expect(calendar.getState().focusedDate).toMatchObject({ month: 10, day: 1 });

    calendar.chooseMonth(12);
    expect(calendar.getState().view).toBe('days');
    expect(labels(calendar)).toEqual(['December 2026', 'January 2027']);
  });
});

describe('visible months: range', () => {
  it('selects a range across two months with both ends visible', () => {
    const calendar = createCalendar<'range'>({
      selection: 'range',
      visibleMonths: 2,
      locale: 'en-US',
      now,
    });
    calendar.select(d(2026, 10, 28));
    calendar.select(d(2026, 11, 3));

    expect(calendar.getState().value).toMatchObject({
      start: { month: 10, day: 28 },
      end: { month: 11, day: 3 },
    });
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 10 });
    expect(cellIn(calendar, 0, 10, 30)?.isInRange).toBe(true);
    expect(cellIn(calendar, 1, 11, 1)?.isInRange).toBe(true);
    expect(cellIn(calendar, 1, 11, 3)?.isRangeEnd).toBe(true);
  });
});
