import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateTimePicker } from '../src';

afterEach(cleanup);

const value = {
  date: { system: 'gregory', year: 2026, month: 10, day: 14 },
  time: { hour: 9, minute: 30, second: 0 },
} as const;

describe('<DateTimePicker /> clear button', () => {
  it('clears the value and gives the focus to the input', () => {
    const onChange = vi.fn();
    render(<DateTimePicker locale="en-US" hourCycle={24} defaultValue={value} onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).not.toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('is not shown for an empty or a disabled picker', () => {
    const { rerender } = render(<DateTimePicker locale="en-US" />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    rerender(<DateTimePicker locale="en-US" defaultValue={value} disabled />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
