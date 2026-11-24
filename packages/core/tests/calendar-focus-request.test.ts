import { describe, expect, it } from 'vitest';
import { createCalendar } from '../src/index';

const now = () => new Date(2026, 9, 14);
const key = (name: string) => ({ key: name, preventDefault: () => undefined });

describe('focusRequest', () => {
  it('starts at 0', () => {
    expect(createCalendar({ now }).getState().focusRequest).toBe(0);
  });

  it('grows by one for each handled key', () => {
    const calendar = createCalendar({ now });
    expect(calendar.handleKeyDown(key('ArrowRight'))).toBe(true);
    expect(calendar.getState().focusRequest).toBe(1);
    expect(calendar.handleKeyDown(key('ArrowDown'))).toBe(true);
    expect(calendar.getState().focusRequest).toBe(2);
  });

  it('does not change for a key that is not handled', () => {
    const calendar = createCalendar({ now });
    const before = calendar.getState();
    expect(calendar.handleKeyDown(key('a'))).toBe(false);
    expect(calendar.getState()).toBe(before);
  });

  it('is already new when a listener reads the state', () => {
    const calendar = createCalendar({ now });
    const seen: number[] = [];
    calendar.subscribe(() => seen.push(calendar.getState().focusRequest));
    calendar.handleKeyDown(key('ArrowRight'));
    expect(seen).toEqual([1]);
  });

  it('gives a new snapshot for a handled key that changes nothing else', () => {
    // Today (14 October) is before `minDate`, so Enter on the focused day selects nothing.
    const calendar = createCalendar({
      now,
      minDate: { system: 'gregory', year: 2026, month: 10, day: 20 },
    });
    const before = calendar.getState();
    expect(calendar.handleKeyDown(key('Enter'))).toBe(true);
    const after = calendar.getState();
    expect(after).not.toBe(before);
    expect(after.focusRequest).toBe(1);
  });

  it('grows when the view changes', () => {
    const calendar = createCalendar({ now });
    calendar.setView('months');
    expect(calendar.getState().focusRequest).toBe(1);
    calendar.setView('months');
    expect(calendar.getState().focusRequest).toBe(1);
    calendar.chooseMonth(3);
    expect(calendar.getState().view).toBe('days');
    expect(calendar.getState().focusRequest).toBe(2);
  });

  it('grows for the buttons of the month and the year', () => {
    const calendar = createCalendar({ now });
    calendar.getMonthButtonProps().handlers.click();
    expect(calendar.getState().focusRequest).toBe(1);
    calendar.getMonthButtonProps().handlers.click();
    expect(calendar.getState().focusRequest).toBe(2);
    calendar.getYearButtonProps().handlers.click();
    expect(calendar.getState().focusRequest).toBe(3);
  });

  it('does not grow for the navigation buttons or a click on a day', () => {
    const calendar = createCalendar({ now });
    calendar.getNextButtonProps().handlers.click();
    calendar.getPrevButtonProps().handlers.click();
    calendar.getDayProps({ system: 'gregory', year: 2026, month: 10, day: 20 }).handlers.click();
    expect(calendar.getState().focusRequest).toBe(0);
  });
});
