import { addDays, convertDate, createDate, registerCalendar } from '@calendrix/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { persian } from '../src';

beforeAll(() => {
  registerCalendar(persian);
});

describe('persian: conversion anchors', () => {
  it.each([
    // [gregorian y, m, d] -> [persian y, m, d]
    [
      [1970, 1, 1],
      [1348, 10, 11],
    ],
    [
      [2024, 3, 20],
      [1403, 1, 1],
    ], // Nowruz 1403
    [
      [2025, 3, 20],
      [1403, 12, 30],
    ], // last day of a leap year
    [
      [2025, 3, 21],
      [1404, 1, 1],
    ], // Nowruz 1404
    [
      [2026, 3, 21],
      [1405, 1, 1],
    ], // Nowruz 1405
    [
      [2026, 9, 23],
      [1405, 7, 1],
    ], // 1 Mehr 1405
    [
      [2026, 10, 14],
      [1405, 7, 22],
    ],
  ] as const)('gregorian %j is persian %j', (g, p) => {
    const greg = createDate('gregory', g[0], g[1], g[2]);
    expect(convertDate(greg, 'persian')).toEqual({
      system: 'persian',
      year: p[0],
      month: p[1],
      day: p[2],
    });
    expect(convertDate(createDate('persian', p[0], p[1], p[2]), 'gregory')).toEqual(greg);
  });
});

describe('persian: month lengths and leap years', () => {
  it('has 31 days in months 1 to 6 and 30 days in months 7 to 11', () => {
    for (let month = 1; month <= 6; month++) expect(persian.daysInMonth(1404, month)).toBe(31);
    for (let month = 7; month <= 11; month++) expect(persian.daysInMonth(1404, month)).toBe(30);
  });

  it.each([
    [1395, true],
    [1399, true],
    [1403, true],
    [1404, false],
    [1408, true],
  ])('isLeapYear(%i) = %s', (year, expected) => {
    expect(persian.isLeapYear(year)).toBe(expected);
  });

  it('gives Esfand 30 days in a leap year and 29 otherwise', () => {
    expect(persian.daysInMonth(1403, 12)).toBe(30);
    expect(persian.daysInMonth(1404, 12)).toBe(29);
  });

  it('rejects invalid months and impossible days', () => {
    expect(() => persian.daysInMonth(1404, 0)).toThrow(RangeError);
    expect(() => persian.daysInMonth(1404, 13)).toThrow(RangeError);
    expect(() => createDate('persian', 1404, 12, 30)).toThrow(RangeError);
    expect(() => createDate('persian', 1404, 7, 31)).toThrow(RangeError);
  });
});

describe('persian: date arithmetic', () => {
  it('crosses the year boundary in a common year', () => {
    expect(addDays(createDate('persian', 1404, 12, 29), 1)).toMatchObject({
      year: 1405,
      month: 1,
      day: 1,
    });
  });

  it('includes Esfand 30 in a leap year', () => {
    const lastCommonDay = createDate('persian', 1403, 12, 29);
    expect(addDays(lastCommonDay, 1)).toMatchObject({ year: 1403, month: 12, day: 30 });
    expect(addDays(lastCommonDay, 2)).toMatchObject({ year: 1404, month: 1, day: 1 });
  });

  it('crosses the 31-day to 30-day month boundary', () => {
    expect(addDays(createDate('persian', 1404, 6, 31), 1)).toMatchObject({ month: 7, day: 1 });
  });
});

describe('persian: round trips', () => {
  it('maps every day between 1380 and 1430 and back to the same day', () => {
    const start = persian.toEpochDay({ system: 'persian', year: 1380, month: 1, day: 1 });
    const end = persian.toEpochDay({ system: 'persian', year: 1430, month: 12, day: 29 });
    let previous = persian.fromEpochDay(start - 1);

    for (let epochDay = start; epochDay <= end; epochDay++) {
      const date = persian.fromEpochDay(epochDay);
      expect(persian.toEpochDay(date)).toBe(epochDay);
      // Dates must advance by exactly one day: next day of month, or first of next month/year.
      const isNextDay =
        (date.year === previous.year &&
          date.month === previous.month &&
          date.day === previous.day + 1) ||
        (date.day === 1 &&
          ((date.year === previous.year && date.month === previous.month + 1) ||
            (date.year === previous.year + 1 && date.month === 1 && previous.month === 12)));
      expect(isNextDay).toBe(true);
      previous = date;
    }
  }, 60_000);
});
