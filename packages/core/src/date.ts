import { getCalendar } from './calendars/registry';
import type { CalendarDate, CalendarSystem } from './types';

/** Create a validated date. Throws RangeError for impossible dates (e.g. Feb 30). */
export function createDate(
  system: CalendarSystem,
  year: number,
  month: number,
  day: number,
): CalendarDate {
  const cal = getCalendar(system);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new RangeError('Year, month and day must be integers.');
  }
  if (month < 1 || month > cal.monthsInYear(year)) {
    throw new RangeError(`Invalid month ${month} for ${system} year ${year}.`);
  }
  if (day < 1 || day > cal.daysInMonth(year, month)) {
    throw new RangeError(`Invalid day ${day} for ${system} ${year}-${month}.`);
  }
  return { system, year, month, day };
}

/** Add (or subtract) days. Works across month, year and leap-day boundaries. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const cal = getCalendar(date.system);
  return cal.fromEpochDay(cal.toEpochDay(date) + days);
}

/** Convert a date to another calendar system. */
export function convertDate(date: CalendarDate, to: CalendarSystem): CalendarDate {
  if (date.system === to) return date;
  return getCalendar(to).fromEpochDay(getCalendar(date.system).toEpochDay(date));
}

/** Negative if a < b, 0 if equal, positive if a > b. Compares across systems. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return getCalendar(a.system).toEpochDay(a) - getCalendar(b.system).toEpochDay(b);
}

export function isSameDay(a: CalendarDate, b: CalendarDate): boolean {
  return compareDates(a, b) === 0;
}
