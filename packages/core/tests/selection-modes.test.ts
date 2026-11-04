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

function makeRange(options: CalendarOptions<'range'> = {}) {
  return createCalendar<'range'>({ selection: 'range', locale: 'en-US', now, ...options });
}

function makeMultiple(options: CalendarOptions<'multiple'> = {}) {
  return createCalendar<'multiple'>({ selection: 'multiple', locale: 'en-US', now, ...options });
}

type Weeks = ReturnType<Calendar['getState']>['weeks'];

/** The cell of a day of the visible month (not one of the days of the neighbouring months). */
function cellOf(calendar: { getState(): { weeks: Weeks } }, day: number) {
  return calendar
    .getState()
    .weeks.flat()
    .find((cell) => cell.date.day === day && !cell.isOutsideMonth);
}

function press(calendar: Pick<Calendar, 'handleKeyDown'>, key: string) {
  const preventDefault = vi.fn();
  const handled = calendar.handleKeyDown({ key, preventDefault });
  return { handled, prevented: preventDefault.mock.calls.length > 0 };
}

const days = (list: CalendarDate[]) => list.map((date) => date.day);

describe('range: choosing', () => {
  it('the first click sets the start and changes nothing else', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 10));

    const state = calendar.getState();
    expect(state.selection).toBe('range');
    expect(state.anchor).toMatchObject({ day: 10 });
    expect(state.value).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(cellOf(calendar, 10)).toMatchObject({
      isSelected: true,
      isRangeStart: true,
      isRangeEnd: true,
    });
  });

  it('the second click completes the range and reports it once', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 10));
    calendar.select(d(2026, 10, 15));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
    const state = calendar.getState();
    expect(state.anchor).toBeNull();
    expect(state.value).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
    expect(state.focusedDate).toMatchObject({ day: 15 });
  });

  it('swaps the days when the second one is earlier', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 15));
    calendar.select(d(2026, 10, 10));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
  });

  it('the same day twice is a range of one day', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 12));
    calendar.select(d(2026, 10, 12));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 12 }, end: { day: 12 } });
  });

  it('marks the start, the end and the days between', () => {
    const calendar = makeRange({ defaultValue: { start: d(2026, 10, 10), end: d(2026, 10, 15) } });

    expect(cellOf(calendar, 10)).toMatchObject({
      isSelected: true,
      isRangeStart: true,
      isRangeEnd: false,
      isInRange: false,
    });
    expect(cellOf(calendar, 12)).toMatchObject({
      isSelected: true,
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: true,
    });
    expect(cellOf(calendar, 15)).toMatchObject({ isSelected: true, isRangeEnd: true });
    expect(cellOf(calendar, 9)).toMatchObject({ isSelected: false, isInRange: false });
    expect(cellOf(calendar, 16)).toMatchObject({ isSelected: false });
  });

  it('a click after a complete range starts a new one and keeps the old value until it is done', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 10));
    calendar.select(d(2026, 10, 15));

    calendar.select(d(2026, 10, 20));
    expect(calendar.getState().anchor).toMatchObject({ day: 20 });
    expect(calendar.getState().value).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
    expect(onChange).toHaveBeenCalledTimes(1);

    calendar.select(d(2026, 10, 22));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1]?.[0]).toMatchObject({ start: { day: 20 }, end: { day: 22 } });
  });

  it('a start that is a controlled value is not reported before the end', () => {
    const onChange = vi.fn();
    const calendar = makeRange({
      value: { start: d(2026, 10, 10), end: d(2026, 10, 15) },
      onChange,
    });
    calendar.select(d(2026, 10, 20));
    expect(onChange).not.toHaveBeenCalled();

    calendar.select(d(2026, 10, 22));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 20 }, end: { day: 22 } });
    // Controlled: the value changes only when the parent passes a new one.
    expect(calendar.getState().value).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
  });

  it('puts the ends of a default value in order', () => {
    const calendar = makeRange({ defaultValue: { start: d(2026, 10, 15), end: d(2026, 10, 10) } });
    expect(calendar.getState().value).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
  });
});

describe('range: preview', () => {
  it('draws the range up to the day that is previewed, without changing the value', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 10));
    calendar.previewTo(d(2026, 10, 15));

    expect(cellOf(calendar, 10)).toMatchObject({ isRangeStart: true, isInPreview: true });
    expect(cellOf(calendar, 12)).toMatchObject({ isInRange: true, isInPreview: true });
    expect(cellOf(calendar, 15)).toMatchObject({ isRangeEnd: true, isInPreview: true });
    expect(cellOf(calendar, 16)).toMatchObject({ isInPreview: false });
    expect(calendar.getState().value).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    calendar.previewTo(null);
    expect(cellOf(calendar, 12)).toMatchObject({ isInRange: false, isInPreview: false });
    expect(cellOf(calendar, 10)).toMatchObject({ isRangeStart: true, isSelected: true });
  });

  it('works backwards from the start', () => {
    const calendar = makeRange();
    calendar.select(d(2026, 10, 10));
    calendar.previewTo(d(2026, 10, 7));

    expect(cellOf(calendar, 7)).toMatchObject({ isRangeStart: true, isInPreview: true });
    expect(cellOf(calendar, 10)).toMatchObject({ isRangeEnd: true });
  });

  it('is ignored while no start is waiting for its end', () => {
    const calendar = makeRange();
    const before = calendar.getState();
    calendar.previewTo(d(2026, 10, 15));
    expect(calendar.getState()).toBe(before);
  });
});

describe('range: keyboard', () => {
  it('Enter sets the start, the arrows preview and Enter completes', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });

    press(calendar, 'Enter');
    expect(calendar.getState().anchor).toMatchObject({ day: 14 });

    press(calendar, 'ArrowRight');
    press(calendar, 'ArrowRight');
    expect(cellOf(calendar, 15)).toMatchObject({ isInPreview: true });
    expect(cellOf(calendar, 16)).toMatchObject({ isInPreview: true, isRangeEnd: true });
    expect(cellOf(calendar, 17)).toMatchObject({ isInPreview: false });

    press(calendar, 'Enter');
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 14 }, end: { day: 16 } });
  });

  it('Escape cancels a start that waits for its end, and is not used otherwise', () => {
    const calendar = makeRange();
    expect(press(calendar, 'Escape')).toEqual({ handled: false, prevented: false });

    calendar.select(d(2026, 10, 10));
    expect(press(calendar, 'Escape')).toEqual({ handled: true, prevented: true });
    expect(calendar.getState().anchor).toBeNull();
    expect(cellOf(calendar, 10)).toMatchObject({ isSelected: false });
  });
});

describe('range: days that cannot be used', () => {
  it('an unavailable day cannot be an end, but a range may contain one', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ isDateUnavailable: (date) => date.day === 12, onChange });

    calendar.select(d(2026, 10, 12));
    expect(calendar.getState().anchor).toBeNull();

    calendar.select(d(2026, 10, 10));
    calendar.select(d(2026, 10, 15));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
  });

  it('refuses a range with an unavailable day when allowUnavailableInRange is false', () => {
    const onChange = vi.fn();
    const calendar = makeRange({
      isDateUnavailable: (date) => date.day === 12,
      allowUnavailableInRange: false,
      onChange,
    });

    calendar.select(d(2026, 10, 10));
    calendar.select(d(2026, 10, 15));
    expect(onChange).not.toHaveBeenCalled();
    expect(calendar.getState().anchor).toMatchObject({ day: 10 });

    calendar.select(d(2026, 10, 11));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 10 }, end: { day: 11 } });
  });

  it('a disabled day cannot be a start', () => {
    const calendar = makeRange({ minDate: d(2026, 10, 10) });
    calendar.select(d(2026, 10, 5));
    expect(calendar.getState().anchor).toBeNull();
  });
});

describe('range: clearing, months and props', () => {
  it('clear removes the value and reports null', () => {
    const onChange = vi.fn();
    const calendar = makeRange({
      defaultValue: { start: d(2026, 10, 10), end: d(2026, 10, 15) },
      onChange,
    });
    calendar.clear();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(calendar.getState().value).toBeNull();
  });

  it('clear also cancels a start that waits for its end, without reporting', () => {
    const onChange = vi.fn();
    const calendar = makeRange({ onChange });
    calendar.select(d(2026, 10, 10));
    calendar.clear();
    expect(calendar.getState().anchor).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks the months that contain an end of the range', () => {
    const calendar = makeRange();
    calendar.select(d(2026, 10, 30));
    calendar.select(d(2026, 11, 2));

    const { months } = calendar.getState();
    expect(months[9]?.isSelected).toBe(true);
    expect(months[10]?.isSelected).toBe(true);
    expect(months[0]?.isSelected).toBe(false);
  });

  it('puts the state of a range in the props', () => {
    const calendar = makeRange();
    calendar.select(d(2026, 10, 10));

    expect(calendar.getGridProps().attrs['aria-multiselectable']).toBe(true);
    expect(calendar.getDayProps(d(2026, 10, 10)).attrs['data-range-start']).toBe(true);
    expect(calendar.getDayProps(d(2026, 10, 11)).attrs['data-range-start']).toBeUndefined();
  });
});

describe('multiple', () => {
  it('a click selects a day and another click unselects it', () => {
    const onChange = vi.fn();
    const calendar = makeMultiple({ onChange });

    calendar.select(d(2026, 10, 10));
    calendar.select(d(2026, 10, 12));
    expect(days(onChange.mock.calls.at(-1)?.[0] as CalendarDate[])).toEqual([10, 12]);

    calendar.select(d(2026, 10, 10));
    expect(days(onChange.mock.calls.at(-1)?.[0] as CalendarDate[])).toEqual([12]);
    expect(days(calendar.getState().value)).toEqual([12]);
  });

  it('reports the days from the oldest to the newest', () => {
    const onChange = vi.fn();
    const calendar = makeMultiple({ onChange });
    calendar.select(d(2026, 10, 20));
    calendar.select(d(2026, 10, 10));
    expect(days(onChange.mock.calls.at(-1)?.[0] as CalendarDate[])).toEqual([10, 20]);
  });

  it('stops adding at maxSelected but still allows removing', () => {
    const onChange = vi.fn();
    const calendar = makeMultiple({ maxSelected: 2, onChange });
    calendar.select(d(2026, 10, 1));
    calendar.select(d(2026, 10, 2));
    calendar.select(d(2026, 10, 3));
    expect(days(calendar.getState().value)).toEqual([1, 2]);
    expect(onChange).toHaveBeenCalledTimes(2);

    calendar.select(d(2026, 10, 1));
    calendar.select(d(2026, 10, 3));
    expect(days(calendar.getState().value)).toEqual([2, 3]);
  });

  it('Enter toggles the focused day', () => {
    const calendar = makeMultiple();
    press(calendar, 'Enter');
    expect(days(calendar.getState().value)).toEqual([14]);
    press(calendar, 'Enter');
    expect(calendar.getState().value).toEqual([]);
  });

  it('marks every selected day and tells assistive technology', () => {
    const calendar = makeMultiple();
    calendar.select(d(2026, 10, 10));
    calendar.select(d(2026, 10, 12));

    expect(cellOf(calendar, 10)?.isSelected).toBe(true);
    expect(cellOf(calendar, 11)?.isSelected).toBe(false);
    expect(cellOf(calendar, 12)?.isSelected).toBe(true);
    expect(calendar.getDayProps(d(2026, 10, 10)).attrs['aria-selected']).toBe(true);
    expect(calendar.getGridProps().attrs['aria-multiselectable']).toBe(true);
  });

  it('puts a default value in order and removes duplicates', () => {
    const calendar = makeMultiple({
      defaultValue: [d(2026, 10, 20), d(2026, 10, 10), d(2026, 10, 10)],
    });
    expect(days(calendar.getState().value)).toEqual([10, 20]);
  });

  it('starts with an empty list, not null', () => {
    expect(makeMultiple().getState().value).toEqual([]);
  });

  it('clear empties the list and reports it once', () => {
    const onChange = vi.fn();
    const calendar = makeMultiple({ onChange });
    calendar.select(d(2026, 10, 10));
    calendar.clear();
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);

    calendar.clear();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('does not select an unavailable day', () => {
    const calendar = makeMultiple({ isDateUnavailable: (date) => date.day === 12 });
    calendar.select(d(2026, 10, 12));
    expect(calendar.getState().value).toEqual([]);
  });
});

describe('single', () => {
  it('is not marked as multi-select', () => {
    const calendar = createCalendar({ locale: 'en-US', now });
    expect(calendar.getGridProps().attrs['aria-multiselectable']).toBeUndefined();
  });
});
