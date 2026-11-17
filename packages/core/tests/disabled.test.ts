import { describe, expect, it, vi } from 'vitest';
import { createCalendar } from '../src/calendar';
import { createTimeField } from '../src/time-field';

const now = () => new Date(2026, 9, 14);
const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });
const keyEvent = (key: string) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  preventDefault: vi.fn(),
});

describe('calendar: disabled', () => {
  it('follows the option, also when it is unset', () => {
    const calendar = createCalendar({ now });
    expect(calendar.getState().disabled).toBe(false);
    calendar.setOptions({ disabled: true });
    expect(calendar.getState().disabled).toBe(true);
    calendar.setOptions({ disabled: false });
    expect(calendar.getState().disabled).toBe(false);
    calendar.setOptions({ disabled: true });
    calendar.setOptions({ disabled: undefined });
    expect(calendar.getState().disabled).toBe(false);
  });

  it('removes the handlers of every prop getter, and keeps them when enabled', () => {
    const calendar = createCalendar({ now });
    expect(Object.keys(calendar.getDayProps(oct(20)).handlers)).toEqual(['click']);
    expect(Object.keys(calendar.getPrevButtonProps().handlers)).toEqual(['click']);

    calendar.setOptions({ disabled: true });
    expect(calendar.getDayProps(oct(20)).handlers).toEqual({});
    expect(calendar.getPrevButtonProps().handlers).toEqual({});
    expect(calendar.getNextButtonProps().handlers).toEqual({});
    expect(calendar.getMonthButtonProps().handlers).toEqual({});
    expect(calendar.getYearButtonProps().handlers).toEqual({});
    expect(calendar.getGridProps().handlers).toEqual({});
  });

  it('ignores keys and the pointer preview', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({ now, disabled: true, onChange });
    const event = keyEvent('ArrowRight');
    const before = calendar.getState();

    expect(calendar.handleKeyDown(event as never)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(calendar.getState()).toBe(before);
    expect(calendar.getState().focusRequest).toBe(before.focusRequest);

    const range = createCalendar({ now, selection: 'range' });
    range.select(oct(10));
    range.setOptions({ disabled: true });
    const listener = vi.fn();
    range.subscribe(listener);
    range.previewTo(oct(15));
    expect(listener).not.toHaveBeenCalled();
  });

  it('still lets the application change the calendar', () => {
    const onChange = vi.fn();
    const calendar = createCalendar({ now, disabled: true, onChange });
    calendar.select(oct(20));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ day: 20 }));
    expect(calendar.getState().value).toMatchObject({ day: 20 });

    calendar.nextMonth();
    expect(calendar.getState().visibleMonth).toEqual({ year: 2026, month: 11 });

    calendar.setOptions({ value: oct(5) });
    expect(calendar.getState().value).toMatchObject({ day: 5 });
  });

  it('describes inert elements, and nothing changes when enabled', () => {
    const calendar = createCalendar({ now });
    expect(calendar.getRootProps().attrs['aria-disabled']).toBeUndefined();
    expect(calendar.getRootProps().attrs['data-disabled']).toBeUndefined();
    expect(calendar.getPrevButtonProps().attrs.disabled).toBeUndefined();
    expect(calendar.getDayProps(oct(14)).attrs.tabindex).toBe(0);

    calendar.setOptions({ disabled: true });
    expect(calendar.getRootProps().attrs['aria-disabled']).toBe(true);
    expect(calendar.getRootProps().attrs['data-disabled']).toBe(true);
    expect(calendar.getPrevButtonProps().attrs.disabled).toBe(true);
    expect(calendar.getMonthButtonProps().attrs.disabled).toBe(true);
    expect(calendar.getDayProps(oct(14)).attrs.tabindex).toBe(-1);
    expect(calendar.getDayProps(oct(14)).attrs['aria-disabled']).toBe(true);
    // The days keep their own `data-disabled` for min and max only.
    expect(calendar.getDayProps(oct(14)).attrs['data-disabled']).toBeUndefined();

    calendar.setView('months');
    expect(calendar.getMonthProps(3).attrs.tabindex).toBe(-1);
    expect(calendar.getMonthProps(3).attrs['aria-disabled']).toBe(true);
  });

  it('keeps showing the selection', () => {
    const calendar = createCalendar({ now, value: oct(5), disabled: true });
    expect(calendar.getDayProps(oct(5)).attrs['aria-selected']).toBe(true);
    expect(calendar.getDayProps(oct(5)).attrs['data-selected']).toBe(true);
  });
});

describe('time field: disabled', () => {
  const value = { hour: 9, minute: 30, second: 0 };

  it('follows the option, also when it is unset', () => {
    const field = createTimeField({ hourCycle: 24 });
    expect(field.getState().disabled).toBe(false);
    field.setOptions({ disabled: true });
    expect(field.getState().disabled).toBe(true);
    field.setOptions({ disabled: undefined });
    expect(field.getState().disabled).toBe(false);
  });

  it('ignores keys and the focus of a segment', () => {
    const onChange = vi.fn();
    const field = createTimeField({ hourCycle: 24, defaultValue: value, disabled: true, onChange });
    const event = keyEvent('ArrowUp');

    expect(field.handleKeyDown('hour', event as never)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    field.getSegmentProps('hour').handlers.keydown(event as never);
    field.getSegmentProps('hour').handlers.focus();
    field.focusSegment('minute');

    expect(onChange).not.toHaveBeenCalled();
    expect(field.getState().value).toEqual(value);
    expect(field.getState().activeSegment).toBeNull();
    expect(field.getState().focusRequest).toBe(0);
  });

  it('still lets the application change the field', () => {
    const field = createTimeField({ hourCycle: 24, defaultValue: value, disabled: true });
    field.increment('hour', 1);
    expect(field.getState().value).toMatchObject({ hour: 10, minute: 30 });
    field.clear();
    expect(field.getState().value).toBeNull();
    field.setOptions({ value });
    expect(field.getState().value).toEqual(value);
  });

  it('describes inert elements, and nothing changes when enabled', () => {
    const field = createTimeField({ hourCycle: 24, defaultValue: value });
    expect(field.getRootProps().attrs['aria-disabled']).toBeUndefined();
    expect(field.getSegmentProps('hour').attrs.tabindex).toBe(0);
    expect(field.getSegmentProps('hour').attrs['aria-disabled']).toBeUndefined();

    field.setOptions({ disabled: true });
    expect(field.getRootProps().attrs['aria-disabled']).toBe(true);
    expect(field.getRootProps().attrs['data-disabled']).toBe(true);
    expect(field.getSegmentProps('hour').attrs.tabindex).toBe(-1);
    expect(field.getSegmentProps('hour').attrs['aria-disabled']).toBe(true);
    expect(field.getSegmentProps('hour').attrs['aria-valuenow']).toBe(9);
  });
});