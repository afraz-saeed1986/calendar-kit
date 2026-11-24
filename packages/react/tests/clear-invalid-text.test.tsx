import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DatePicker } from '../src/date-picker';
import { DateTimePicker } from '../src/date-time-picker';

afterEach(cleanup);

const now = () => new Date('2026-10-14T10:00:00Z');
const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });
const limits = { minDate: oct(10), maxDate: oct(20) };

const input = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input.calendrix-input')!;
const clearButton = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.calendrix-clear');
const typeText = (container: HTMLElement, value: string) =>
  fireEvent.change(input(container), { target: { value } });

describe('the clear button and a text that is not a value (ADR 0025)', () => {
  it('is not there while the input is empty', () => {
    const { container } = render(<DatePicker locale="en-US" now={now} {...limits} />);
    expect(clearButton(container)).toBeNull();
  });

  it('DatePicker: clears a text that is not allowed, and gives the focus to the input', () => {
    const { container } = render(<DatePicker locale="en-US" now={now} {...limits} />);
    typeText(container, '10/25/2026');
    expect(clearButton(container)).not.toBeNull();
    fireEvent.click(clearButton(container)!);
    expect(input(container).value).toBe('');
    expect(clearButton(container)).toBeNull();
    expect(document.activeElement).toBe(input(container));
  });

  it('DateTimePicker: clears a text that is not allowed', () => {
    const { container } = render(
      <DateTimePicker locale="en-US" hourCycle={24} now={now} {...limits} />,
    );
    typeText(container, '10/25/2026 09:30');
    fireEvent.click(clearButton(container)!);
    expect(input(container).value).toBe('');
    expect(document.activeElement).toBe(input(container));
  });
});
