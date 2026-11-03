import { createDate, type DateTimeValue } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateTimePicker } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { locale: 'en-US', hourCycle: 24, timeZone: 'UTC', now } as const;

const oct14at0930: DateTimeValue = {
  date: createDate('gregory', 2026, 10, 14),
  time: { hour: 9, minute: 30, second: 0 },
};

const input = () => screen.getByRole('textbox') as HTMLInputElement;
const toggle = () => screen.getByRole('button', { name: 'Choose date and time' });
const openPopover = () => fireEvent.click(toggle());
const day = (name: RegExp) => screen.getByRole('gridcell', { name });

describe('<DateTimePicker />: input', () => {
  it('starts closed, with a placeholder that shows the format', () => {
    render(<DateTimePicker {...base} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(input().placeholder).toBe('10/14/2026 09:30');
  });

  it('shows the value in the format of the locale', () => {
    render(<DateTimePicker {...base} defaultValue={oct14at0930} />);
    expect(input().value).toBe('10/14/2026 09:30');
  });

  it('reads a typed date and time', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '10/20/2026 14:05' } });
    expect(onChange).toHaveBeenCalledWith({
      date: createDate('gregory', 2026, 10, 20),
      time: { hour: 14, minute: 5, second: 0 },
    });
  });

  it('marks text that is not a date as invalid once the user leaves the field', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '10/20/2026 25:00' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input().getAttribute('aria-invalid')).toBeNull();
    fireEvent.blur(input());
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('reports null when the text is emptied', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} defaultValue={oct14at0930} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('leaves the text as typed, and tidies it up on blur', () => {
    render(<DateTimePicker {...base} />);
    fireEvent.change(input(), { target: { value: '10/20/2026 9:05' } });
    expect(input().value).toBe('10/20/2026 9:05');
    fireEvent.blur(input());
    expect(input().value).toBe('10/20/2026 09:05');
  });

  it('reads and writes Persian dates with Persian numerals', () => {
    const onChange = vi.fn();
    render(
      <DateTimePicker
        {...base}
        system="persian"
        locale="fa-IR"
        plugins={[persianPlugin]}
        onChange={onChange}
      />,
    );
    fireEvent.change(input(), { target: { value: '۱۴۰۵/۷/۲۲ ۱۴:۰۵' } });
    expect(onChange).toHaveBeenCalledWith({
      date: { system: 'persian', year: 1405, month: 7, day: 22 },
      time: { hour: 14, minute: 5, second: 0 },
    });
    fireEvent.blur(input());
    expect(input().value).toBe('۱۴۰۵/۰۷/۲۲ ۱۴:۰۵');
  });

  it('shows a new value from the parent, also after typing the parent did not accept', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimePicker {...base} value={oct14at0930} onChange={onChange} />,
    );
    fireEvent.change(input(), { target: { value: '10/20/2026 14:05' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(
      <DateTimePicker
        {...base}
        value={{
          date: createDate('gregory', 2026, 11, 2),
          time: { hour: 8, minute: 0, second: 0 },
        }}
        onChange={onChange}
      />,
    );
    expect(input().value).toBe('11/02/2026 08:00');
  });
});

describe('<DateTimePicker />: popover', () => {
  it('opens with the button and puts the focus on a day', () => {
    render(<DateTimePicker {...base} />);
    openPopover();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.getAttribute('role')).toBe('gridcell');
  });

  it('opens with the down arrow in the input', () => {
    render(<DateTimePicker {...base} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes with Escape and returns the focus to the input', () => {
    render(<DateTimePicker {...base} />);
    openPopover();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('closes when the user clicks outside', () => {
    render(<DateTimePicker {...base} />);
    openPopover();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('picking a day sets the time to midnight when there is none', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    openPopover();
    fireEvent.click(day(/October 20\b/));
    expect(onChange).toHaveBeenCalledWith({
      date: createDate('gregory', 2026, 10, 20),
      time: { hour: 0, minute: 0, second: 0 },
    });
  });

  it('keeps a time chosen before the date', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    openPopover();
    const hour = screen.getByRole('spinbutton', { name: 'Hour' });
    fireEvent.keyDown(hour, { key: '1' });
    fireEvent.keyDown(hour, { key: '4' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(day(/October 20\b/));
    expect(onChange).toHaveBeenCalledWith({
      date: createDate('gregory', 2026, 10, 20),
      time: { hour: 14, minute: 0, second: 0 },
    });
  });
});
