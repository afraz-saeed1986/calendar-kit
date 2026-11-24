import { describe, expect, it } from 'vitest';
import { createCalendar, createTimeField } from '../src/index';

const now = () => new Date(2026, 9, 14);

describe('calendar options set to undefined', () => {
  it('behave like options that are not passed', () => {
    const everyOption = {
      system: undefined,
      locale: undefined,
      direction: undefined,
      weekStart: undefined,
      focusedDate: undefined,
      onFocusedDateChange: undefined,
      value: undefined,
      defaultValue: undefined,
      onChange: undefined,
      selection: undefined,
      visibleMonths: undefined,
      allowUnavailableInRange: undefined,
      maxSelected: undefined,
      minDate: undefined,
      maxDate: undefined,
      isDateUnavailable: undefined,
      labels: undefined,
      timeZone: undefined,
      plugins: undefined,
    };
    const withUndefined = createCalendar({ ...everyOption, now });
    const without = createCalendar({ now });
    expect(withUndefined.getState()).toEqual(without.getState());
  });

  const dayCell = (
    calendar: Pick<ReturnType<typeof createCalendar<'single'>>, 'getState'>,
    day: number,
  ) => {
    const found = calendar
      .getState()
      .weeks.flat()
      .find((cell) => !cell.isOutsideMonth && cell.date.day === day);
    if (!found) throw new Error(`No day ${day}`);
    return found;
  };

  it('unset minDate in setOptions', () => {
    const minDate = { system: 'gregory', year: 2026, month: 10, day: 10 } as const;
    const calendar = createCalendar({ now, minDate });
    expect(dayCell(calendar, 5).isDisabled).toBe(true);

    calendar.setOptions({ minDate: undefined });
    expect(dayCell(calendar, 5).isDisabled).toBe(false);
  });

  it('unset isDateUnavailable in setOptions', () => {
    const calendar = createCalendar({ now, isDateUnavailable: (date) => date.day === 5 });
    expect(dayCell(calendar, 5).isUnavailable).toBe(true);

    calendar.setOptions({ isDateUnavailable: undefined });
    expect(dayCell(calendar, 5).isUnavailable).toBe(false);
  });

  it('unset locale in setOptions (back to en-US)', () => {
    const calendar = createCalendar({ now, locale: 'de-DE' });
    expect(calendar.getState().monthName).toBe('Oktober');

    calendar.setOptions({ locale: undefined });
    expect(calendar.getState().locale).toBe('en-US');
    expect(calendar.getState().monthName).toBe('October');
  });
});

describe('time field options set to undefined', () => {
  it('behave like options that are not passed', () => {
    const everyOption = {
      locale: undefined,
      hourCycle: undefined,
      showSeconds: undefined,
      hourStep: undefined,
      minuteStep: undefined,
      secondStep: undefined,
      minTime: undefined,
      maxTime: undefined,
      value: undefined,
      defaultValue: undefined,
      onChange: undefined,
      labels: undefined,
    };
    expect(createTimeField(everyOption).getState()).toEqual(createTimeField().getState());
  });

  it('unset showSeconds in setOptions', () => {
    const field = createTimeField({ locale: 'en-US', showSeconds: true });
    expect(field.getState().segments.map((segment) => segment.type)).toEqual([
      'hour',
      'minute',
      'second',
      'period',
    ]);

    field.setOptions({ showSeconds: undefined });
    expect(field.getState().segments.map((segment) => segment.type)).toEqual([
      'hour',
      'minute',
      'period',
    ]);
  });
});
