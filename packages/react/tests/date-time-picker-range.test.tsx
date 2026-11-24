import { createDate, type DateTimeRange } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateTimePicker } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { selection: 'range', locale: 'en-US', hourCycle: 24, timeZone: 'UTC', now } as const;
const DASH = '\u2013';

const at = (day: number, hour: number, minute = 0) => ({
  date: createDate('gregory', 2026, 10, day),
  time: { hour, minute, second: 0 },
});
const week: DateTimeRange = { start: at(14, 9, 30), end: at(21, 17, 0) };
const sameDay: DateTimeRange = { start: at(14, 9, 30), end: at(14, 17, 0) };

const input = () => screen.getByRole('textbox') as HTMLInputElement;
const openPopover = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Choose date and time' }));
const day = (name: RegExp) => screen.getByRole('gridcell', { name });
const hourOf = (group: string) =>
  within(screen.getByRole('group', { name: group })).getAllByRole('spinbutton')[0] as HTMLElement;
const type = (element: HTMLElement, keys: string) => {
  for (const key of keys) fireEvent.keyDown(element, { key });
};

describe('<DateTimePicker selection="range" />: input', () => {
  it('shows the format of a range as the placeholder', () => {
    render(<DateTimePicker {...base} />);
    expect(input().placeholder).toBe(`10/14/2026 09:30 ${DASH} 10/21/2026 17:00`);
  });

  it('shows a range in the format of the locale', () => {
    render(<DateTimePicker {...base} defaultValue={week} />);
    expect(input().value).toBe(`10/14/2026 09:30 ${DASH} 10/21/2026 17:00`);
  });

  it('shows a range with the numerals of the locale and the calendar system', () => {
    render(
      <DateTimePicker
        {...base}
        system="persian"
        locale="fa-IR"
        plugins={[persianPlugin]}
        defaultValue={week}
      />,
    );
    expect(input().value).toMatch(/[\u06F0-\u06F9]/);
    expect(input().value).toContain(DASH);
  });

  it('reads a typed range', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: `10/20/2026 14:05 ${DASH} 10/22/2026 16:00` } });
    expect(onChange).toHaveBeenCalledWith({ start: at(20, 14, 5), end: at(22, 16, 0) });
  });

  it('does not report a text with one end, and marks it invalid after the blur', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '10/20/2026 14:05' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input());
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('reports null when the text is emptied', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} defaultValue={week} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('<DateTimePicker selection="range" />: popover', () => {
  it('shows two months and a time field for each end', () => {
    const { baseElement } = render(<DateTimePicker {...base} />);
    openPopover();
    expect(baseElement.querySelectorAll('.calendrix-panel')).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Start time' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'End time' })).toBeTruthy();
  });

  it('reports the range with the default times once the second day is picked', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    openPopover();
    fireEvent.click(day(/October 20, 2026/));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(day(/October 22, 2026/));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ start: at(20, 0), end: at(22, 0) });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('keeps the times chosen before the days', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} onChange={onChange} />);
    openPopover();
    type(hourOf('Start time'), '14');
    type(hourOf('End time'), '18');
    fireEvent.click(day(/October 20, 2026/));
    fireEvent.click(day(/October 22, 2026/));
    expect(onChange).toHaveBeenLastCalledWith({ start: at(20, 14), end: at(22, 18) });
  });

  it('changes a time of a complete range', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} defaultValue={week} onChange={onChange} />);
    openPopover();
    fireEvent.keyDown(hourOf('End time'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ start: at(14, 9, 30), end: at(21, 18, 0) });
  });

  it('sticks the end to the start when the end time is set earlier on the same day', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} defaultValue={sameDay} onChange={onChange} />);
    openPopover();
    type(hourOf('End time'), '08');
    expect(onChange).toHaveBeenLastCalledWith({ start: at(14, 9, 30), end: at(14, 9, 30) });
  });

  it('sticks the end to the start when the start time is set later than the end', () => {
    const onChange = vi.fn();
    render(<DateTimePicker {...base} defaultValue={sameDay} onChange={onChange} />);
    openPopover();
    type(hourOf('Start time'), '19');
    const last = onChange.mock.lastCall?.[0] as DateTimeRange;
    expect(last.start).toEqual(last.end);
    expect(last.start.time.hour).toBe(19);
  });
});
