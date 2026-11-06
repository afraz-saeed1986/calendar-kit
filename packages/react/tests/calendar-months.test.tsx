import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { locale: 'en-US', timeZone: 'UTC', now, visibleMonths: 2 } as const;

const day = (month: string, number: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`${month} ${number}\\b`) });

const gridLabels = () => screen.getAllByRole('grid').map((grid) => grid.getAttribute('aria-label'));

describe('<Calendar visibleMonths={2} />', () => {
  it('shows two months, each in its own grid, and one label for the group', () => {
    render(<Calendar {...base} />);
    expect(gridLabels()).toEqual(['October 2026', 'November 2026']);
    expect(screen.getByRole('group', { name: 'October 2026 – November 2026' })).toBeTruthy();
  });

  it('shows every day once: the days of the other months stay empty', () => {
    render(<Calendar {...base} />);
    // 31 days of October and 30 days of November.
    expect(screen.getAllByRole('gridcell')).toHaveLength(61);
  });

  it('has one previous and one next button', () => {
    render(<Calendar {...base} />);
    expect(screen.getAllByRole('button', { name: /previous month/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /next month/i })).toHaveLength(1);
  });

  it('the next button moves by one month', () => {
    render(<Calendar {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(gridLabels()).toEqual(['November 2026', 'December 2026']);
  });

  it('moves the months when the keyboard leaves them', () => {
    render(
      <Calendar {...base} focusedDate={{ system: 'gregory', year: 2026, month: 10, day: 31 }} />,
    );
    expect(gridLabels()).toEqual(['October 2026', 'November 2026']);

    fireEvent.click(day('November', 30));
    fireEvent.keyDown(day('November', 30), { key: 'ArrowRight' });
    expect(gridLabels()).toEqual(['November 2026', 'December 2026']);
    expect(document.activeElement).toBe(day('December', 1));
  });

  it('selects a range across two months', () => {
    const onChange = vi.fn();
    render(<Calendar {...base} selection="range" onChange={onChange} />);

    fireEvent.click(day('October', 28));
    fireEvent.click(day('November', 3));

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      start: { month: 10, day: 28 },
      end: { month: 11, day: 3 },
    });
    expect(day('October', 30).getAttribute('data-in-range')).toBe('true');
    expect(day('November', 1).getAttribute('data-in-range')).toBe('true');
    expect(day('November', 3).getAttribute('data-range-end')).toBe('true');
  });

  it('previews the range from one month into the other', () => {
    render(<Calendar {...base} selection="range" />);
    fireEvent.click(day('October', 28));
    fireEvent.pointerEnter(day('November', 3));

    expect(day('October', 30).getAttribute('data-in-preview')).toBe('true');
    expect(day('November', 2).getAttribute('data-in-preview')).toBe('true');
    expect(day('November', 4).getAttribute('data-in-preview')).toBeNull();
  });

  it('opens the months view as a single panel', () => {
    render(<Calendar {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /^October/ }));

    expect(screen.getAllByRole('grid')).toHaveLength(1);
    expect(screen.getAllByRole('gridcell')).toHaveLength(12);
  });
});
