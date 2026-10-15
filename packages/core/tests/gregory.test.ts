import { describe, expect, it } from 'vitest';
import { addDays, compareDates, createDate, gregory, getCalendar } from '../src';

describe('gregory: leap years and month lengths', () => {
  it.each([
    [2000, true],
    [1900, false],
    [2024, true],
    [2026, false],
    [2100, false],
  ])('isLeapYear(%i) = %s', (year, expected) => {
    expect(gregory.isLeapYear(year)).toBe(expected);
  });

  it('returns 29 days for February in a leap year and 28 otherwise', () => {
    expect(gregory.daysInMonth(2024, 2)).toBe(29);
    expect(gregory.daysInMonth(2026, 2)).toBe(28);
  });

  it('rejects invalid months', () => {
    expect(() => gregory.daysInMonth(2026, 0)).toThrow(RangeError);
    expect(() => gregory.daysInMonth(2026, 13)).toThrow(RangeError);
  });
});

describe('gregory: epoch-day conversion', () => {
  it('maps known anchors', () => {
    expect(gregory.toEpochDay({ system: 'gregory', year: 1970, month: 1, day: 1 })).toBe(0);
    expect(gregory.toEpochDay({ system: 'gregory', year: 2000, month: 3, day: 1 })).toBe(11017);
    expect(gregory.fromEpochDay(0)).toEqual({ system: 'gregory', year: 1970, month: 1, day: 1 });
  });

  it('round-trips every day from 1800 to 2200', () => {
    const start = gregory.toEpochDay({ system: 'gregory', year: 1800, month: 1, day: 1 });
    const end = gregory.toEpochDay({ system: 'gregory', year: 2200, month: 12, day: 31 });
    for (let d = start; d <= end; d++) {
      expect(gregory.toEpochDay(gregory.fromEpochDay(d))).toBe(d);
    }
  });
});

describe('date helpers', () => {
  it('createDate validates impossible dates', () => {
    expect(() => createDate('gregory', 2026, 2, 29)).toThrow(RangeError);
    expect(() => createDate('gregory', 2026, 13, 1)).toThrow(RangeError);
    expect(createDate('gregory', 2024, 2, 29).day).toBe(29);
  });

  it('addDays crosses month, year and leap-day boundaries', () => {
    expect(addDays(createDate('gregory', 2024, 2, 28), 1).day).toBe(29);
    expect(addDays(createDate('gregory', 2026, 2, 28), 1)).toMatchObject({ month: 3, day: 1 });
    expect(addDays(createDate('gregory', 2026, 12, 31), 1)).toMatchObject({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addDays(createDate('gregory', 2026, 3, 1), -1)).toMatchObject({ month: 2, day: 28 });
  });

  it('compareDates orders dates', () => {
    const a = createDate('gregory', 2026, 10, 14);
    const b = createDate('gregory', 2026, 10, 15);
    expect(compareDates(a, b)).toBeLessThan(0);
    expect(compareDates(b, a)).toBeGreaterThan(0);
    expect(compareDates(a, a)).toBe(0);
  });

  it('getCalendar fails loudly for unknown systems', () => {
    expect(() => getCalendar('persian')).toThrow(/Unknown calendar system/);
  });
});
