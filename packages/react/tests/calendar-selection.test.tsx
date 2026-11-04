import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { locale: 'en-US', timeZone: 'UTC', now } as const;

const day = (number: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`October ${number}\\b`) });
const selected = (number: number) => day(number).getAttribute('aria-selected');

describe('<Calendar selection="range" />', () => {
  it('two clicks make a range and it is reported once', () => {
    const onChange = vi.fn();
    render(<Calendar {...base} selection="range" onChange={onChange} />);

    fireEvent.click(day(10));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(day(15));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 10 }, end: { day: 15 } });
    expect(selected(10)).toBe('true');
    expect(selected(12)).toBe('true');
    expect(selected(15)).toBe('true');
    expect(selected(9)).toBe('false');
    expect(day(10).getAttribute('data-range-start')).toBe('true');
    expect(day(12).getAttribute('data-in-range')).toBe('true');
    expect(day(15).getAttribute('data-range-end')).toBe('true');
  });

  it('previews the range while the pointer moves and removes it when the pointer leaves', () => {
    render(<Calendar {...base} selection="range" />);
    fireEvent.click(day(10));

    fireEvent.pointerEnter(day(15));
    expect(day(12).getAttribute('data-in-preview')).toBe('true');
    expect(day(15).getAttribute('data-range-end')).toBe('true');
    expect(day(16).getAttribute('data-in-preview')).toBeNull();

    fireEvent.pointerLeave(screen.getByRole('grid'));
    expect(day(12).getAttribute('data-in-preview')).toBeNull();
  });

  it('works with the keyboard: Enter, arrows (preview), Enter', () => {
    const onChange = vi.fn();
    render(<Calendar {...base} selection="range" onChange={onChange} />);

    fireEvent.keyDown(day(14), { key: 'Enter' });
    fireEvent.keyDown(day(14), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(day(15));
    expect(day(15).getAttribute('data-in-preview')).toBe('true');

    fireEvent.keyDown(day(15), { key: 'Enter' });
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ start: { day: 14 }, end: { day: 15 } });
  });

  it('Escape cancels the start of a range', () => {
    render(<Calendar {...base} selection="range" />);
    fireEvent.click(day(10));
    expect(selected(10)).toBe('true');

    fireEvent.keyDown(day(10), { key: 'Escape' });
    expect(selected(10)).toBe('false');
  });
});

describe('<Calendar selection="multiple" />', () => {
  it('a click selects a day and another click unselects it', () => {
    const onChange = vi.fn();
    render(<Calendar {...base} selection="multiple" onChange={onChange} />);

    fireEvent.click(day(10));
    fireEvent.click(day(12));
    expect(selected(10)).toBe('true');
    expect(selected(12)).toBe('true');
    expect(selected(11)).toBe('false');

    fireEvent.click(day(10));
    expect(selected(10)).toBe('false');
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1);
    expect(screen.getByRole('grid').getAttribute('aria-multiselectable')).toBe('true');
  });

  it('a single calendar is not marked as multi-select', () => {
    render(<Calendar {...base} />);
    expect(screen.getByRole('grid').getAttribute('aria-multiselectable')).toBeNull();
  });
});
