import { describe, expect, it } from 'vitest';
import { createDate } from '../src';
import { formatDateTime, formatTime, parseDateTime, parseTime } from '../src/text-time';
import type { HourCycle, TimeValue } from '../src/time-types';

const time = (hour: number, minute: number, second = 0): TimeValue => ({ hour, minute, second });

/** Newer ICU versions put a narrow no-break space before AM/PM; compare with a normal one. */
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatTime', () => {
  it.each<[string, HourCycle, boolean, TimeValue, string]>([
    ['de-DE', 24, false, time(9, 5), '09:05'],
    ['de-DE', 24, true, time(9, 5, 30), '09:05:30'],
    ['en-US', 12, false, time(9, 5), '09:05 AM'],
    ['en-US', 12, false, time(21, 5), '09:05 PM'],
    ['en-US', 12, false, time(0, 0), '12:00 AM'],
    ['fa-IR', 24, false, time(9, 5), '۰۹:۰۵'],
  ])('writes for %s (%i-hour, seconds: %s)', (locale, hourCycle, seconds, value, expected) => {
    expect(plain(formatTime(value, { locale, hourCycle, seconds }))).toBe(expected);
  });
});

describe('parseTime', () => {
  it.each<[string, TimeValue]>([
    ['09:05', time(9, 5)],
    ['9:05', time(9, 5)],
    ['۰۹:۰۵', time(9, 5)],
    ['09:05:30', time(9, 5, 30)],
    ['9:05 PM', time(21, 5)],
    ['12:00 AM', time(0, 0)],
    ['12:30 pm', time(12, 30)],
    ['11:59 p.m.', time(23, 59)],
  ])('reads "%s"', (text, expected) => {
    expect(parseTime(text)).toEqual(expected);
  });

  it.each(['24:00', '13:00 PM', '9:5', '12:60', 'abc', ''])('returns null for "%s"', (text) => {
    expect(parseTime(text)).toBeNull();
  });

  it('round-trips through formatTime', () => {
    const cases: Array<[string, HourCycle]> = [
      ['en-US', 12],
      ['de-DE', 24],
      ['fa-IR', 24],
    ];
    for (const [locale, hourCycle] of cases) {
      for (const value of [time(0, 0), time(9, 5), time(12, 30), time(23, 59)]) {
        expect(parseTime(formatTime(value, { locale, hourCycle }))).toEqual(value);
      }
    }
  });
});

describe('date and time together', () => {
  const oct14 = createDate('gregory', 2026, 10, 14);

  it('writes a date and a time', () => {
    expect(
      formatDateTime({ date: oct14, time: time(9, 30) }, { locale: 'en-US', hourCycle: 24 }),
    ).toBe('10/14/2026 09:30');
  });

  it.each<[string, string, TimeValue]>([
    ['10/14/2026 09:30', 'en-US', time(9, 30)],
    ['2026-10-14T21:05:30', 'en-US', time(21, 5, 30)],
    ['14.10.2026 9:30 PM', 'de-DE', time(21, 30)],
  ])('reads "%s" in %s', (text, locale, expected) => {
    expect(parseDateTime(text, { locale })).toEqual({ date: oct14, time: expected });
  });

  it.each(['10/14/2026', '10/14/2026 25:00', '02/30/2026 09:30'])(
    'returns null for "%s"',
    (text) => {
      expect(parseDateTime(text, { locale: 'en-US' })).toBeNull();
    },
  );
});
