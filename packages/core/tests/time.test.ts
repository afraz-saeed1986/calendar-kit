import { describe, expect, it } from 'vitest';
import { createDate } from '../src';
import { formatISODate, formatISOTime, parseISODate, parseISOTime } from '../src/iso';
import { fromInstant, toInstant } from '../src/timezone';

const at = (y: number, m: number, d: number, hour: number, minute = 0, second = 0) => ({
  date: createDate('gregory', y, m, d),
  time: { hour, minute, second },
});

describe('iso: dates', () => {
  it('formats and parses a date', () => {
    expect(formatISODate(createDate('gregory', 2026, 10, 14))).toBe('2026-10-14');
    expect(parseISODate('2026-10-14')).toEqual(createDate('gregory', 2026, 10, 14));
  });

  it('rejects dates that do not exist', () => {
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('hello')).toBeNull();
    expect(parseISODate('2024-02-29')).not.toBeNull();
  });
});

describe('iso: times', () => {
  it('formats a time with and without seconds', () => {
    const time = { hour: 9, minute: 5, second: 30 };
    expect(formatISOTime(time)).toBe('09:05');
    expect(formatISOTime(time, { seconds: true })).toBe('09:05:30');
  });

  it('parses valid times and rejects invalid ones', () => {
    expect(parseISOTime('09:05')).toEqual({ hour: 9, minute: 5, second: 0 });
    expect(parseISOTime('23:59:59')).toEqual({ hour: 23, minute: 59, second: 59 });
    expect(parseISOTime('24:00')).toBeNull();
    expect(parseISOTime('12:60')).toBeNull();
    expect(parseISOTime('9:05')).toBeNull();
  });
});

describe('timezone: toInstant and fromInstant', () => {
  it('converts in UTC', () => {
    expect(toInstant(at(2026, 10, 14, 12), 'UTC').toISOString()).toBe('2026-10-14T12:00:00.000Z');
  });

  it('converts in Tehran (UTC+03:30, no daylight saving)', () => {
    expect(toInstant(at(2026, 10, 14, 12), 'Asia/Tehran').toISOString()).toBe(
      '2026-10-14T08:30:00.000Z',
    );
  });

  it('converts in New York in summer (UTC-4)', () => {
    expect(toInstant(at(2026, 7, 1, 12), 'America/New_York').toISOString()).toBe(
      '2026-07-01T16:00:00.000Z',
    );
  });

  it('moves a missing wall time forward (spring gap)', () => {
    // 8 March 2026: at 02:00 New York clocks jump to 03:00, so 02:30 does not exist.
    expect(toInstant(at(2026, 3, 8, 2, 30), 'America/New_York').toISOString()).toBe(
      '2026-03-08T07:30:00.000Z', // 03:30 EDT
    );
  });

  it('uses the first instant of a repeated wall time (autumn)', () => {
    // 1 November 2026: at 02:00 New York clocks go back to 01:00, so 01:30 happens twice.
    expect(toInstant(at(2026, 11, 1, 1, 30), 'America/New_York').toISOString()).toBe(
      '2026-11-01T05:30:00.000Z', // 01:30 EDT, the first one
    );
  });

  it('reads the wall clock of an instant', () => {
    const value = fromInstant(new Date('2026-10-14T08:30:00Z'), 'Asia/Tehran');
    expect(value.date).toEqual(createDate('gregory', 2026, 10, 14));
    expect(value.time).toEqual({ hour: 12, minute: 0, second: 0 });
  });

  it('round-trips through an instant', () => {
    const original = at(2026, 12, 31, 23, 59, 58);
    const back = fromInstant(toInstant(original, 'Europe/Berlin'), 'Europe/Berlin');
    expect(back).toEqual(original);
  });
});
