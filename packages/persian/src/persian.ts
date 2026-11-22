import type { CalendarDate, CalendarImplementation } from '@calendrix/core';

const SYSTEM = 'persian';
const MS_PER_DAY = 86_400_000;

/** 1 Farvardin 1349 AP is 21 March 1970, which is epoch day 79. Used only to estimate. */
const ANCHOR_YEAR = 1349;
const ANCHOR_EPOCH_DAY = 79;
const MEAN_YEAR_LENGTH = 365.2425;

/** Safety cap for the correction loop in `searchNowruz`. A good estimate needs 0 to 2 steps. */
const MAX_CORRECTION_STEPS = 10;

/** The first six months have 31 days each. */
const FIRST_HALF_DAYS = 186;

/** The Nowruz days are kept; the cache is emptied if it ever grows past this. */
const MAX_CACHED_YEARS = 1000;

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

/** Days since 1970-01-01 to a Persian date, read from Intl. Used to find the Nowruz days. */
function intlFromEpochDay(epochDay: number): CalendarDate {
  const parts = formatter.formatToParts(new Date(epochDay * MS_PER_DAY));
  return {
    system: SYSTEM,
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
  };
}

function compare(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * The epoch day of 1 Farvardin of a year. Intl only converts in one direction, so this makes a
 * close estimate from the mean year length and then walks day by day until Intl agrees.
 */
function searchNowruz(year: number): number {
  const target: CalendarDate = { system: SYSTEM, year, month: 1, day: 1 };
  let guess = Math.round(ANCHOR_EPOCH_DAY + (year - ANCHOR_YEAR) * MEAN_YEAR_LENGTH);

  for (let step = 0; step <= MAX_CORRECTION_STEPS; step++) {
    const order = compare(intlFromEpochDay(guess), target);
    if (order === 0) return guess;
    guess += order < 0 ? 1 : -1;
  }

  throw new RangeError(`Invalid Persian year: ${year}. Create dates with createDate().`);
}

const nowruzDays = new Map<number, number>();

/**
 * The epoch day of 1 Farvardin, from Intl the first time and from the cache after that. Every
 * other conversion is arithmetic on this number, so Intl is asked twice for a year, not for each
 * day.
 */
function nowruz(year: number): number {
  const known = nowruzDays.get(year);
  if (known !== undefined) return known;
  const found = searchNowruz(year);
  if (nowruzDays.size >= MAX_CACHED_YEARS) nowruzDays.clear();
  nowruzDays.set(year, found);
  return found;
}

/** A Persian year is leap when it is 366 days long, measured between two Nowruz days. */
function isLeapYear(year: number): boolean {
  return nowruz(year + 1) - nowruz(year) === 366;
}

function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid Persian month: ${month}`);
  }
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isLeapYear(year) ? 30 : 29;
}

/** 1-based day number inside a Persian year, assuming the first six months have 31 days. */
function dayOfYear(month: number, day: number): number {
  return month <= 6 ? (month - 1) * 31 + day : FIRST_HALF_DAYS + (month - 7) * 30 + day;
}

/** Days since 1970-01-01 to a Persian date. */
function fromEpochDay(epochDay: number): CalendarDate {
  // The estimate can be a year off; the Nowruz days settle it.
  let year = Math.floor(ANCHOR_YEAR + (epochDay - ANCHOR_EPOCH_DAY) / MEAN_YEAR_LENGTH);
  while (nowruz(year) > epochDay) year--;
  while (nowruz(year + 1) <= epochDay) year++;

  const index = epochDay - nowruz(year);
  if (index < FIRST_HALF_DAYS) {
    return { system: SYSTEM, year, month: Math.floor(index / 31) + 1, day: (index % 31) + 1 };
  }
  const rest = index - FIRST_HALF_DAYS;
  return { system: SYSTEM, year, month: 7 + Math.floor(rest / 30), day: (rest % 30) + 1 };
}

/** Inverse of `fromEpochDay`. A date that does not exist is an error. */
function toEpochDay(date: CalendarDate): number {
  const { year, month, day } = date;
  const valid =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= daysInMonth(year, month);
  if (!valid) {
    throw new RangeError(
      `Invalid Persian date: ${year}-${month}-${day}. Create dates with createDate().`,
    );
  }
  return nowruz(year) + dayOfYear(month, day) - 1;
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