import { persianPlugin } from '@calendrix/persian';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../src/date-picker';

const now = () => new Date(2026, 10, 9);
const nov = (day: number) => ({ system: 'gregory', year: 2026, month: 11, day });

function open() {
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });
}

function type(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
}

/** The first match: with six weeks shown, a few days of the next month repeat. */
const day = (label: string) => screen.getAllByText(label)[0] as HTMLElement;

describe('DatePicker', () => {
  afterEach(cleanup);

  it('commits a typed date', () => {
    const onChange = vi.fn();
    render(<DatePicker now={now} onChange={onChange} />);
    type('11/18/2026');
    expect(onChange).toHaveBeenCalledWith(nov(18));
  });

  it('commits a typed range', () => {
    const onChange = vi.fn();
    render(<DatePicker selection="range" now={now} onChange={onChange} />);
    type('11/18/2026 \u2013 11/25/2026');
    expect(onChange).toHaveBeenCalledWith({ start: nov(18), end: nov(25) });
  });

  it('shows a range as text', () => {
    render(<DatePicker selection="range" now={now} value={{ start: nov(18), end: nov(25) }} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '11/18/2026 \u2013 11/25/2026',
    );
  });

  it('closes after a picked day and gives the focus back to the input', () => {
    const onChange = vi.fn();
    render(<DatePicker now={now} onChange={onChange} />);
    open();
    fireEvent.click(day('15'));
    expect(onChange).toHaveBeenCalledWith(nov(15));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('closes after the second day of a range, not after the first', () => {
    const onChange = vi.fn();
    render(<DatePicker selection="range" now={now} onChange={onChange} />);
    open();
    fireEvent.click(day('18'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(day('25'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ start: nov(18), end: nov(25) });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stays open after a range with closeOnSelect={false}', () => {
    render(<DatePicker selection="range" closeOnSelect={false} now={now} />);
    open();
    fireEvent.click(day('18'));
    fireEvent.click(day('25'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('stays open while days are picked in multiple mode, and lists them', () => {
    const onChange = vi.fn();
    render(<DatePicker selection="multiple" now={now} onChange={onChange} />);
    open();
    fireEvent.click(day('5'));
    fireEvent.click(day('7'));
    expect(onChange).toHaveBeenLastCalledWith([nov(5), nov(7)]);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('11/05/2026, 11/07/2026');
  });

  it('shows a count for a long list', () => {
    render(
      <DatePicker
        selection="multiple"
        now={now}
        value={[nov(1), nov(2), nov(3), nov(4)]}
      />,
    );
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('4 dates');
  });

  it('has a read-only input in multiple mode that Delete clears', () => {
    const onChange = vi.fn();
    render(
      <DatePicker selection="multiple" now={now} value={[nov(5)]} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    fireEvent.keyDown(input, { key: 'Delete' });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('clears the selection with the button in the field', () => {
    const onChange = vi.fn();
    render(<DatePicker selection="multiple" now={now} value={[nov(5)]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('has no clear button when nothing is selected', () => {
    render(<DatePicker selection="range" now={now} />);
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('reads a typed Persian range', () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        selection="range"
        system="persian"
        locale="fa-IR"
        plugins={[persianPlugin]}
        now={now}
        onChange={onChange}
      />,
    );
    type('\u06f1\u06f4\u06f0\u06f5/\u06f0\u06f9/\u06f0\u06f1 \u062a\u0627 \u06f1\u06f4\u06f0\u06f5/\u06f1\u06f0/\u06f0\u06f5');
    expect(onChange).toHaveBeenCalledWith({
      start: { system: 'persian', year: 1405, month: 9, day: 1 },
      end: { system: 'persian', year: 1405, month: 10, day: 5 },
    });
  });
});