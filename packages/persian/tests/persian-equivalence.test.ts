import { describe, expect, it } from 'vitest';
import { persian } from '../src/persian';

/** What the runtime says, with no help from the code under test. */
const raw = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});
function fromIntl(epochDay: number) {
  const parts = raw.formatToParts(new Date(epochDay * 86_400_000));
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { system: 'persian', year: read('year'), month: read('month'), day: read('day') };
}

// About 1200 AP to 1500 AP.
const FIRST = -54_400;
const LAST = 55_200;

describe('persian: the arithmetic agrees with Intl', () => {
  it('converts every day of three centuries like Intl, and back', () => {
    for (let day = FIRST; day <= LAST; day++) {
      const date = persian.fromEpochDay(day);
      expect(date).toEqual(fromIntl(day));
      expect(persian.toEpochDay(date)).toBe(day);
    }
  });

  it('knows the leap years like Intl: the last day of the year is 30 Esfand', () => {
    for (let year = 1200; year <= 1500; year++) {
      const lastDay = fromIntl(persian.toEpochDay({ system: 'persian', year: year + 1, month: 1, day: 1 }) - 1);
      expect(persian.isLeapYear(year)).toBe(lastDay.day === 30);
      expect(persian.daysInMonth(year, 12)).toBe(persian.isLeapYear(year) ? 30 : 29);
    }
  });

  it('refuses dates that do not exist', () => {
    const date = (year: number, month: number, day: number) => ({ system: 'persian', year, month, day });
    expect(() => persian.toEpochDay(date(1405, 7, 31))).toThrow(RangeError);
    expect(() => persian.toEpochDay(date(1405, 13, 1))).toThrow(RangeError);
    expect(() => persian.toEpochDay(date(1405, 1, 0))).toThrow(RangeError);
    const common = [1404, 1405, 1406].find((year) => !persian.isLeapYear(year))!;
    expect(() => persian.toEpochDay(date(common, 12, 30))).toThrow(RangeError);
  });
});