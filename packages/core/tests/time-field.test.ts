import { describe, expect, it, vi } from 'vitest';
import { createTimeField, type TimeField, type TimeSegmentType } from '../src';

const press = (
  field: TimeField,
  type: TimeSegmentType,
  key: string,
  extra: { ctrlKey?: boolean } = {},
) => {
  const preventDefault = vi.fn();
  const handled = field.handleKeyDown(type, { key, preventDefault, ...extra });
  return { handled, preventDefault };
};

const typeKeys = (field: TimeField, type: TimeSegmentType, keys: string) => {
  for (const key of keys) press(field, type, key);
};

const value = (field: TimeField) => field.getState().value;

describe('time field: state', () => {
  it('starts empty, with placeholders', () => {
    const field = createTimeField({ locale: 'de-DE' });
    const state = field.getState();
    expect(state.hourCycle).toBe(24);
    expect(state.value).toBeNull();
    expect(state.segments.map((s) => s.type)).toEqual(['hour', 'minute']);
    expect(state.segments.every((s) => s.isPlaceholder && s.text === '--')).toBe(true);
  });

  it('uses a 12-hour clock with AM/PM for en-US', () => {
    const field = createTimeField({
      locale: 'en-US',
      defaultValue: { hour: 13, minute: 5, second: 0 },
    });
    const { segments } = field.getState();
    expect(segments.map((s) => s.type)).toEqual(['hour', 'minute', 'period']);
    expect(segments.map((s) => s.text)).toEqual(['01', '05', 'PM']);
    expect(segments[0]?.numericValue).toBe(1);
    expect(segments[2]?.numericValue).toBe(1);
  });

  it('adds a seconds segment on request', () => {
    const field = createTimeField({ locale: 'de-DE', showSeconds: true });
    expect(field.getState().segments.map((s) => s.type)).toEqual(['hour', 'minute', 'second']);
  });

  it('shows Persian numerals and right-to-left for fa-IR', () => {
    const field = createTimeField({
      locale: 'fa-IR',
      hourCycle: 24,
      defaultValue: { hour: 9, minute: 5, second: 0 },
    });
    const state = field.getState();
    expect(state.direction).toBe('rtl');
    expect(state.segments.map((s) => s.text)).toEqual(['۰۹', '۰۵']);
  });

  it('returns the same snapshot until something changes', () => {
    const field = createTimeField({ locale: 'de-DE' });
    expect(field.getState()).toBe(field.getState());
  });
});

describe('time field: arrow keys', () => {
  it('an empty field becomes 00:00 on the first step, then steps', () => {
    const field = createTimeField({ locale: 'de-DE' });
    const first = press(field, 'hour', 'ArrowUp');
    expect(first.handled).toBe(true);
    expect(first.preventDefault).toHaveBeenCalled();
    expect(value(field)).toEqual({ hour: 0, minute: 0, second: 0 });

    press(field, 'hour', 'ArrowUp');
    expect(value(field)).toEqual({ hour: 1, minute: 0, second: 0 });
    press(field, 'hour', 'ArrowDown');
    press(field, 'hour', 'ArrowDown');
    expect(value(field)?.hour).toBe(23);
  });

  it('wraps minutes without carrying into the hour', () => {
    const field = createTimeField({
      locale: 'de-DE',
      defaultValue: { hour: 10, minute: 59, second: 0 },
    });
    field.increment('minute', 1);
    expect(value(field)).toEqual({ hour: 10, minute: 0, second: 0 });
  });

  it('uses the step options', () => {
    const field = createTimeField({
      locale: 'de-DE',
      minuteStep: 15,
      defaultValue: { hour: 10, minute: 0, second: 0 },
    });
    field.increment('minute', 1);
    expect(value(field)?.minute).toBe(15);
  });

  it('keeps AM/PM when stepping the hour on a 12-hour clock', () => {
    const field = createTimeField({
      locale: 'en-US',
      defaultValue: { hour: 12, minute: 0, second: 0 }, // 12:00 PM
    });
    field.increment('hour', 1);
    expect(value(field)?.hour).toBe(13); // 01:00 PM
  });

  it('toggles AM/PM with the period segment', () => {
    const field = createTimeField({
      locale: 'en-US',
      defaultValue: { hour: 9, minute: 0, second: 0 },
    });
    field.increment('period', 1);
    expect(value(field)?.hour).toBe(21);
    field.increment('period', -1);
    expect(value(field)?.hour).toBe(9);
  });

  it('Home and End jump to the segment limits', () => {
    const field = createTimeField({
      locale: 'de-DE',
      defaultValue: { hour: 10, minute: 30, second: 0 },
    });
    press(field, 'minute', 'End');
    expect(value(field)?.minute).toBe(59);
    press(field, 'minute', 'Home');
    expect(value(field)?.minute).toBe(0);
  });
});

describe('time field: typing', () => {
  it('two digits make an hour and move to the next segment', () => {
    const field = createTimeField({ locale: 'de-DE' });
    typeKeys(field, 'hour', '14');
    expect(value(field)?.hour).toBe(14);
    expect(field.getState().activeSegment).toBe('minute');
  });

  it('a digit that cannot start a longer number completes at once', () => {
    const field = createTimeField({ locale: 'de-DE' });
    typeKeys(field, 'hour', '3');
    expect(value(field)?.hour).toBe(3);
    expect(field.getState().activeSegment).toBe('minute');
  });

  it('starts over when the typed number would be too big', () => {
    const field = createTimeField({ locale: 'de-DE' });
    typeKeys(field, 'hour', '25');
    expect(value(field)?.hour).toBe(5);
  });

  it('accepts Persian digits', () => {
    const field = createTimeField({ locale: 'fa-IR', hourCycle: 24 });
    typeKeys(field, 'hour', '۱۴');
    expect(value(field)?.hour).toBe(14);
  });

  it('on a 12-hour clock, a lone 0 waits for the next digit', () => {
    const field = createTimeField({ locale: 'en-US' });
    typeKeys(field, 'hour', '0');
    expect(value(field)).toBeNull();
    typeKeys(field, 'hour', '9');
    expect(value(field)?.hour).toBe(9);
  });

  it('on a 12-hour clock, 13 becomes 3', () => {
    const field = createTimeField({ locale: 'en-US' });
    typeKeys(field, 'hour', '13');
    expect(value(field)?.hour).toBe(3);
  });

  it('A and P set AM and PM', () => {
    const field = createTimeField({
      locale: 'en-US',
      defaultValue: { hour: 9, minute: 0, second: 0 },
    });
    press(field, 'period', 'p');
    expect(value(field)?.hour).toBe(21);
    press(field, 'period', 'A');
    expect(value(field)?.hour).toBe(9);
  });

  it('Backspace empties the field and reports null', () => {
    const onChange = vi.fn();
    const field = createTimeField({
      locale: 'de-DE',
      onChange,
      defaultValue: { hour: 9, minute: 0, second: 0 },
    });
    press(field, 'hour', 'Backspace');
    expect(value(field)).toBeNull();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('ignores unknown keys and shortcuts', () => {
    const field = createTimeField({ locale: 'de-DE' });
    const unknown = press(field, 'hour', 'x');
    expect(unknown.handled).toBe(false);
    expect(unknown.preventDefault).not.toHaveBeenCalled();
    expect(press(field, 'hour', 'ArrowUp', { ctrlKey: true }).handled).toBe(false);
    expect(value(field)).toBeNull();
  });
});

describe('time field: limits, control and subscriptions', () => {
  it('rejects values outside minTime and maxTime', () => {
    const onChange = vi.fn();
    const field = createTimeField({
      locale: 'de-DE',
      onChange,
      minTime: { hour: 9, minute: 0, second: 0 },
      maxTime: { hour: 17, minute: 0, second: 0 },
      defaultValue: { hour: 9, minute: 30, second: 0 },
    });
    field.increment('hour', -1); // 08:30 is too early
    expect(value(field)).toEqual({ hour: 9, minute: 30, second: 0 });
    expect(onChange).not.toHaveBeenCalled();
    field.increment('hour', 1);
    expect(value(field)?.hour).toBe(10);
  });

  it('a controlled field only reports changes until the parent passes the new value', () => {
    const onChange = vi.fn();
    const field = createTimeField({
      locale: 'de-DE',
      onChange,
      value: { hour: 10, minute: 0, second: 0 },
    });
    field.increment('hour', 1);
    expect(onChange).toHaveBeenCalledWith({ hour: 11, minute: 0, second: 0 });
    expect(value(field)?.hour).toBe(10);

    field.setOptions({ value: { hour: 11, minute: 0, second: 0 } });
    expect(value(field)?.hour).toBe(11);
  });

  it('setOptions does nothing when no option changed', () => {
    const field = createTimeField({ locale: 'de-DE' });
    const listener = vi.fn();
    field.subscribe(listener);
    const before = field.getState();
    field.setOptions({ locale: 'de-DE' });
    expect(listener).not.toHaveBeenCalled();
    expect(field.getState()).toBe(before);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const field = createTimeField({ locale: 'de-DE' });
    const listener = vi.fn();
    const unsubscribe = field.subscribe(listener);
    field.increment('hour', 1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    field.increment('hour', 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('time field: props', () => {
  it('describes a segment as a spinbutton', () => {
    const field = createTimeField({
      locale: 'de-DE',
      defaultValue: { hour: 9, minute: 5, second: 0 },
    });
    const { attrs } = field.getSegmentProps('hour');
    expect(attrs).toMatchObject({
      role: 'spinbutton',
      tabindex: 0,
      'aria-label': 'Stunde',
      'aria-valuenow': 9,
      'aria-valuemin': 0,
      'aria-valuemax': 23,
      'aria-valuetext': '09',
    });
  });

  it('speaks "Empty" for a segment without a value', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24 });
    const { attrs } = field.getSegmentProps('minute');
    expect(attrs['aria-valuenow']).toBeUndefined();
    expect(attrs['aria-valuetext']).toBe('Empty');
    expect(attrs['data-placeholder']).toBe(true);
  });

  it('labels the group and sets its direction', () => {
    const field = createTimeField({ locale: 'fa-IR' });
    expect(field.getRootProps().attrs).toMatchObject({
      role: 'group',
      'aria-label': 'زمان',
      dir: 'rtl',
    });
  });

  it('the focus handler marks the active segment', () => {
    const field = createTimeField({ locale: 'de-DE' });
    field.getSegmentProps('minute').handlers.focus();
    expect(field.getState().activeSegment).toBe('minute');
  });

  it('throws for a segment that is not shown', () => {
    const field = createTimeField({ locale: 'de-DE' });
    expect(() => field.getSegmentProps('period')).toThrow(RangeError);
  });
});
