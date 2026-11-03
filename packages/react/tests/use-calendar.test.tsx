import { createDate } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useCalendar } from '../src';

afterEach(cleanup);

/** Wednesday, 14 October 2026, which is 22 Mehr 1405. */
const now = () => new Date('2026-10-14T10:00:00Z');
const base = { locale: 'en-US', timeZone: 'UTC' } as const;

describe('useCalendar', () => {
  it('returns the state of the calendar', () => {
    const { result } = renderHook(() => useCalendar({ ...base, now }));
    expect(result.current.state.monthLabel).toBe('October 2026');
  });

  it('re-renders when the calendar changes', () => {
    const { result } = renderHook(() => useCalendar({ ...base, now }));
    act(() => result.current.calendar.nextMonth());
    expect(result.current.state.monthLabel).toBe('November 2026');
  });

  it('keeps the same calendar and the same state between unchanged renders', () => {
    const { result, rerender } = renderHook(() => useCalendar({ ...base, now }));
    const { calendar, state } = result.current;
    rerender();
    expect(result.current.calendar).toBe(calendar);
    expect(result.current.state).toBe(state);
  });

  it('does not loop when options are written inline', () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useCalendar({
        ...base,
        now: () => now(),
        onChange: () => {},
        minDate: createDate('gregory', 2026, 1, 1),
        isDateUnavailable: () => false,
        plugins: [],
      });
    });
    expect(renders).toBeLessThanOrEqual(2);
  });

  it('calls the latest onChange, not an old one', () => {
    const calls: string[] = [];
    const { result, rerender } = renderHook(
      ({ tag }) => useCalendar({ ...base, now, onChange: () => calls.push(tag) }),
      { initialProps: { tag: 'first' } },
    );
    rerender({ tag: 'second' });
    act(() => result.current.calendar.select(createDate('gregory', 2026, 10, 20)));
    expect(calls).toEqual(['second']);
  });

  it('follows a controlled value', () => {
    const { result, rerender } = renderHook(({ value }) => useCalendar({ ...base, now, value }), {
      initialProps: { value: createDate('gregory', 2026, 10, 14) },
    });
    expect(result.current.state.value).toMatchObject({ day: 14 });

    rerender({ value: createDate('gregory', 2026, 10, 20) });
    expect(result.current.state.value).toMatchObject({ day: 20 });

    act(() => result.current.calendar.select(createDate('gregory', 2026, 10, 25)));
    expect(result.current.state.value).toMatchObject({ day: 20 });
  });

  it('works with the Persian calendar and an inline plugin list', () => {
    const { result } = renderHook(() =>
      useCalendar({
        system: 'persian',
        locale: 'fa-IR',
        plugins: [persianPlugin],
        now,
        timeZone: 'UTC',
      }),
    );
    expect(result.current.state.monthLabel).toContain('مهر');
  });
});
