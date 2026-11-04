import { createDate } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026, which is 22 Mehr 1405. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { locale: 'en-US', timeZone: 'UTC', now } as const;

const day = (name: RegExp) => screen.getByRole('gridcell', { name });

describe('<Calendar />', () => {
  it('renders the month as a grid of 42 days', () => {
    render(<Calendar {...base} />);
    expect(screen.getByRole('button', { name: /^October/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^2026/ })).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('selects a day on click and reports it', () => {
    const onChange = vi.fn();
    render(<Calendar {...base} onChange={onChange} />);
    fireEvent.click(day(/October 20\b/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ day: 20 }));
    expect(day(/October 20\b/).getAttribute('aria-selected')).toBe('true');
  });

  it('does not select a disabled day', () => {
    const onChange = vi.fn();
    render(
      <Calendar {...base} onChange={onChange} minDate={createDate('gregory', 2026, 10, 10)} />,
    );
    fireEvent.click(day(/October 5\b/));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('only changes a controlled value when the parent does', () => {
    render(<Calendar {...base} value={createDate('gregory', 2026, 10, 14)} />);
    fireEvent.click(day(/October 20\b/));
    expect(day(/October 14\b/).getAttribute('aria-selected')).toBe('true');
    expect(day(/October 20\b/).getAttribute('aria-selected')).toBe('false');
  });

  it('shows the next month with the next button', () => {
    render(<Calendar {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /^November/ })).toBeTruthy();
  });

  it('puts only the focused day in the tab order', () => {
    render(<Calendar {...base} />);
    expect(day(/October 14\b/).getAttribute('tabindex')).toBe('0');
    expect(day(/October 15\b/).getAttribute('tabindex')).toBe('-1');
  });

  it('moves the real focus with the arrow keys', () => {
    render(<Calendar {...base} />);
    fireEvent.keyDown(day(/October 14\b/), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(day(/October 15\b/));
  });

  it('moves the focus into the next month with PageDown', () => {
    render(<Calendar {...base} />);
    fireEvent.keyDown(day(/October 14\b/), { key: 'PageDown' });
    expect(screen.getByRole('button', { name: /^November/ })).toBeTruthy();
    expect(document.activeElement).toBe(day(/November 14\b/));
  });

  it('is right to left in Persian', () => {
    const { container } = render(
      <Calendar
        system="persian"
        locale="fa-IR"
        plugins={[persianPlugin]}
        now={now}
        timeZone="UTC"
      />,
    );
    expect(container.firstElementChild?.getAttribute('dir')).toBe('rtl');
    expect(screen.getByText(/مهر/)).toBeTruthy();
  });
});
