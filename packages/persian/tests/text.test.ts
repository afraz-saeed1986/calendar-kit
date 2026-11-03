import {
  createDate,
  datePatternOf,
  formatDate,
  formatDateTime,
  parseDate,
  parseDateTime,
  registerCalendar,
} from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { persian } from '../src';

// Registered first: the constants below create Persian dates when the file loads.
registerCalendar(persian);

const mehr22 = createDate('persian', 1405, 7, 22);
const persianOptions = { locale: 'fa-IR', system: 'persian' } as const;

describe('persian dates as text', () => {
  it('writes a Persian date with Persian numerals for fa-IR', () => {
    expect(formatDate(mehr22, 'fa-IR')).toBe('۱۴۰۵/۰۷/۲۲');
  });

  it('writes a Persian date for en-US without era text', () => {
    expect(formatDate(mehr22, 'en-US')).toBe('07/22/1405');
  });

  it('reads the pattern of fa-IR in the Persian calendar', () => {
    expect(datePatternOf('fa-IR', 'persian')).toEqual({
      order: ['year', 'month', 'day'],
      separator: '/',
    });
  });

  it('reads Persian digits, even without leading zeros', () => {
    expect(parseDate('۱۴۰۵/۷/۲۲', persianOptions)).toEqual(mehr22);
  });

  it('reads Latin digits with other separators', () => {
    expect(parseDate('1405-07-22', persianOptions)).toEqual(mehr22);
  });

  it('accepts 30 Esfand in a leap year', () => {
    expect(parseDate('1403/12/30', persianOptions)).toEqual(createDate('persian', 1403, 12, 30));
  });

  it('rejects 30 Esfand in a common year', () => {
    expect(parseDate('1404/12/30', persianOptions)).toBeNull();
  });

  it('rejects day 31 in the second half of the year', () => {
    expect(parseDate('1405/07/31', persianOptions)).toBeNull();
  });

  it('round-trips dates through formatDate', () => {
    for (const date of [
      mehr22,
      createDate('persian', 1403, 12, 30),
      createDate('persian', 1405, 1, 1),
    ]) {
      expect(parseDate(formatDate(date, 'fa-IR'), persianOptions)).toEqual(date);
    }
  });
});

describe('persian date and time as text', () => {
  const value = { date: mehr22, time: { hour: 9, minute: 30, second: 0 } };

  it('round-trips through formatDateTime', () => {
    const text = formatDateTime(value, { locale: 'fa-IR', hourCycle: 24 });
    expect(parseDateTime(text, persianOptions)).toEqual(value);
  });

  it('reads a typed Persian date and time', () => {
    expect(parseDateTime('1405/07/22 21:05', persianOptions)).toEqual({
      date: mehr22,
      time: { hour: 21, minute: 5, second: 0 },
    });
  });
});
