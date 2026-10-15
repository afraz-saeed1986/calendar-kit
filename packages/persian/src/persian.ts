import type { CalendarDate, CalendarImplementation } from '@calendrix/core';

const SYSTEM = 'persian';
const MS_PER_DAY = 86_400_000;

/** 1 Farvardin 1349 AP is 21 March 1970, which is epoch day 79. Used only to estimate. */
const ANCHOR_YEAR = 1349;
const ANCHOR_EPOCH_DAY = 79;
const MEAN_YEAR_LENGTH = 365.2425;

/** Safety cap for the correction loop in `toEpochDay`. A good estimate needs 0 to 2 steps. */
const MAX_CORRECTION_STEPS = 10;

/**
 * Created once: constructing an Intl.DateTimeFormat is far more expensive than using it.
 * `nu-latn` forces Latin digits so the parts can be parsed with Number().
 */
const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function readPart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day'): number {
  const value = Number(parts.find((p) => p.type === type)?.value);
  if (!Number.isInteger(value)) {
    throw new Error(
      'This runtime cannot format the Persian calendar through Intl. Full ICU data is required.',
    );
  }
  return value;
}

/** Days since 1970-01-01 to a Persian date, read from Intl. */
function fromEpochDay(epochDay: number): CalendarDate {
  const parts = formatter.formatToParts(new Date(epochDay * MS_PER_DAY));
  return {
    system: SYSTEM,
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
  };
}

/** 1-based day number inside a Persian year, assuming the first six months have 31 days. */
function dayOfYear(month: number, day: number): number {
  return month <= 6 ? (month - 1) * 31 + day : 186 + (month - 7) * 30 + day;
}

function compare(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * Inverse of `fromEpochDay`. Intl only converts in one direction, so this makes a close
 * estimate from the mean year length and then walks day by day until Intl agrees.
 */
function toEpochDay(date: CalendarDate): number {
  let guess = Math.round(
    ANCHOR_EPOCH_DAY +
      (date.year - ANCHOR_YEAR) * MEAN_YEAR_LENGTH +
      dayOfYear(date.month, date.day) -
      1,
  );

  for (let step = 0; step <= MAX_CORRECTION_STEPS; step++) {
    const order = compare(fromEpochDay(guess), date);
    if (order === 0) return guess;
    guess += order < 0 ? 1 : -1;
  }

  throw new RangeError(
    `Invalid Persian date: ${date.year}-${date.month}-${date.day}. Create dates with createDate().`,
  );
}

/** A Persian year is leap when it is 366 days long, measured between two Nowruz days. */
function isLeapYear(year: number): boolean {
  const nowruz = toEpochDay({ system: SYSTEM, year, month: 1, day: 1 });
  const nextNowruz = toEpochDay({ system: SYSTEM, year: year + 1, month: 1, day: 1 });
  return nextNowruz - nowruz === 366;
}

function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid Persian month: ${month}`);
  }
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isLeapYear(year) ? 30 : 29;
}

/**
 * Persian (Jalali) calendar. Register it before use:
 *
 * ```ts
 * import { registerCalendar } from '@calendrix/core';
 * import { persian } from '@calendrix/persian';
 * registerCalendar(persian);
 * ```
 *
 * Leap years follow the ICU implementation of the runtime. See docs/adr/0004-persian-calendar-via-intl.md.
 */
export const persian: CalendarImplementation = {
  id: SYSTEM,
  daysInMonth,
  monthsInYear: () => 12,
  isLeapYear,
  toEpochDay,
  fromEpochDay,
};
