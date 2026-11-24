import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../src/date-picker';
import { DateTimePicker } from '../src/date-time-picker';

afterEach(cleanup);

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const DASH = '\u2013';

const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });
const at = (day: number, hour: number, minute = 0) => ({
  date: oct(day),
  time: { hour, minute, second: 0 },
});

const limits = {
  minDate: oct(10),
  maxDate: oct(20),
  isDateUnavailable: (date: { day: number }) => date.day === 15,
};

const input = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input.calendrix-input')!;
const typeText = (container: HTMLElement, value: string) =>
  fireEvent.change(input(container), { target: { value } });

describe('DatePicker: a typed date must be one the user could pick (ADR 0025)', () => {
  const setup = (props: Record<string, unknown> = {}) => {
    const onChange = vi.fn();
    const { container } = render(
      <DatePicker
        locale="en-US"
        now={now}
        timeZone="UTC"
        {...limits}
        {...props}
        onChange={onChange}
      />,
    );
    return { container, onChange };
  };

  it('accepts a day inside the limits', () => {
    const { container, onChange } = setup();
    typeText(container, '10/14/2026');
    expect(onChange).toHaveBeenCalledWith(oct(14));
  });

  it('ignores a day outside the limits, and marks the text invalid after the blur', () => {
    const { container, onChange } = setup();
    typeText(container, '10/25/2026');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input(container));
    expect(input(container).getAttribute('aria-invalid')).toBe('true');
  });

  it('ignores a day that isDateUnavailable marks', () => {
    const { container, onChange } = setup();
    typeText(container, '10/15/2026');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts a range inside the limits, and rejects one with an end outside', () => {
    const { container, onChange } = setup({ selection: 'range' });
    typeText(container, `10/12/2026 ${DASH} 10/25/2026`);
    expect(onChange).not.toHaveBeenCalled();
    typeText(container, `10/12/2026 ${DASH} 10/18/2026`);
    expect(onChange).toHaveBeenCalledWith({ start: oct(12), end: oct(18) });
  });

  it('allows an unavailable day inside a range, unless allowUnavailableInRange is false', () => {
    const allowed = setup({ selection: 'range' });
    typeText(allowed.container, `10/12/2026 ${DASH} 10/18/2026`);
    expect(allowed.onChange).toHaveBeenCalledOnce();
    cleanup();

    const forbidden = setup({ selection: 'range', allowUnavailableInRange: false });
    typeText(forbidden.container, `10/12/2026 ${DASH} 10/18/2026`);
    expect(forbidden.onChange).not.toHaveBeenCalled();
  });
});

describe('DateTimePicker: a typed date and time must be ones the user could pick (ADR 0025)', () => {
  const setup = (props: Record<string, unknown> = {}) => {
    const onChange = vi.fn();
    const { container } = render(
      <DateTimePicker
        locale="en-US"
        hourCycle={24}
        now={now}
        timeZone="UTC"
        minTime={{ hour: 9, minute: 0, second: 0 }}
        maxTime={{ hour: 17, minute: 0, second: 0 }}
        {...limits}
        {...props}
        onChange={onChange}
      />,
    );
    return { container, onChange };
  };

  it('accepts a date and a time inside the limits', () => {
    const { container, onChange } = setup();
    typeText(container, '10/14/2026 09:30');
    expect(onChange).toHaveBeenCalledWith(at(14, 9, 30));
  });

  it('ignores a time outside minTime and maxTime', () => {
    const { container, onChange } = setup();
    typeText(container, '10/14/2026 08:30');
    typeText(container, '10/14/2026 17:30');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores a date outside the limits', () => {
    const { container, onChange } = setup();
    typeText(container, '10/25/2026 09:30');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('checks the time of both ends of a range', () => {
    const { container, onChange } = setup({ selection: 'range' });
    typeText(container, `10/12/2026 09:30 ${DASH} 10/18/2026 18:00`);
    expect(onChange).not.toHaveBeenCalled();
    typeText(container, `10/12/2026 09:30 ${DASH} 10/18/2026 17:00`);
    expect(onChange).toHaveBeenCalledWith({ start: at(12, 9, 30), end: at(18, 17, 0) });
  });
});
