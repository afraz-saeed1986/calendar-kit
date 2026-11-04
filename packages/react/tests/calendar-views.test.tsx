import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { persianPlugin } from '@calendrix/persian';
import { afterEach, describe, expect, it } from 'vitest';
import { Calendar, DateTimePicker } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026, which is 22 Mehr 1405. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { locale: 'en-US', timeZone: 'UTC', now } as const;

const monthButton = (name: RegExp) => screen.getByRole('button', { name });
const cell = (name: string | RegExp) => screen.getByRole('gridcell', { name });

describe('<Calendar /> months and years', () => {
  it('shows the month and the year as two buttons', () => {
    render(<Calendar {...base} />);
    expect(monthButton(/^October/).getAttribute('aria-expanded')).toBe('false');
    expect(monthButton(/^2026/).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the months and puts the focus on the current month', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^October/));

    expect(screen.getAllByRole('gridcell')).toHaveLength(12);
    expect(monthButton(/^October/).getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(cell('October 2026'));
  });

  it('choosing a month goes back to the days with the focus on a day', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^October/));
    fireEvent.click(cell('March 2026'));

    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(monthButton(/^March/)).toBeTruthy();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/March 14\b/);
  });

  it('opens a page of years and shows its decade', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^2026/));

    expect(screen.getAllByRole('gridcell')).toHaveLength(12);
    expect(screen.getByText('2020 – 2029')).toBeTruthy();
    expect(cell('2019').getAttribute('data-outside-decade')).toBe('true');
    expect(document.activeElement).toBe(cell('2026'));
  });

  it('the arrows move by a decade and choosing a year goes back to the days', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^2026/));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('2030 – 2039')).toBeTruthy();

    fireEvent.click(cell('2031'));
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(monthButton(/^2031/)).toBeTruthy();
  });

  it('Escape goes back to the days', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^October/));
    fireEvent.keyDown(cell('October 2026'), { key: 'Escape' });
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('moves the real focus with the arrow keys in the months', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^October/));
    fireEvent.keyDown(cell('October 2026'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell('November 2026'));
  });

  it('Enter chooses the focused month', () => {
    render(<Calendar {...base} />);
    fireEvent.click(monthButton(/^October/));
    fireEvent.keyDown(cell('October 2026'), { key: 'ArrowLeft' });
    fireEvent.keyDown(cell('September 2026'), { key: 'Enter' });
    expect(monthButton(/^September/)).toBeTruthy();
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('works in Persian', () => {
    render(
      <Calendar
        system="persian"
        locale="fa-IR"
        plugins={[persianPlugin]}
        now={now}
        timeZone="UTC"
      />,
    );
    fireEvent.click(monthButton(/^مهر/));
    expect(screen.getAllByRole('gridcell')).toHaveLength(12);
    expect(cell(/فروردین/)).toBeTruthy();
  });
});

describe('<DateTimePicker /> with the month and year views', () => {
  it('Escape closes the popover after a click on an arrow, even when the focus is lost', () => {
    render(<DateTimePicker {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose date and time' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /next/i }));

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape on an arrow button in the months returns to the days first', () => {
    render(<DateTimePicker {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose date and time' }));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: /^October/ }));
    const next = within(dialog).getByRole('button', { name: /next/i });
    fireEvent.click(next);
    expect(within(dialog).getAllByRole('gridcell')).toHaveLength(12);

    fireEvent.keyDown(next, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(within(screen.getByRole('dialog')).getAllByRole('gridcell')).toHaveLength(42);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('Escape closes the view first and the popover second', () => {
    render(<DateTimePicker {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose date and time' }));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: /^2026/ }));
    expect(within(dialog).getAllByRole('gridcell')).toHaveLength(12);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(within(screen.getByRole('dialog')).getAllByRole('gridcell')).toHaveLength(42);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
