import { getCalendar } from './calendars/registry';
import { createDate } from './date';
import type { CalendarDate } from './types';

/** The grids of months and years have three columns, so the up and down arrows move by three. */
export const GRID_COLUMNS = 3;
export const YEARS_PER_DECADE = 10;
export const YEARS_PER_PAGE = 12;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The first year of the decade a year belongs to: 1405 gives 1400. */
export function decadeStart(year: number): number {
  return year - mod(year, YEARS_PER_DECADE);
}

/**
 * The years of a page: the decade of `year`, plus the last year before it and the first year after
 * it, so 1405 gives 1399 to 1410.
 */
export function yearPageOf(year: number): number[] {
  const start = decadeStart(year);
  return Array.from({ length: YEARS_PER_PAGE }, (_, index) => start - 1 + index);
}

/**
 * The same day of a given month and year, or the last day of that month if it is shorter:
 * 31 January moved to February gives 28 February, 30 Esfand moved to a common year gives 29.
 */
export function withMonth(date: CalendarDate, year: number, month: number): CalendarDate {
  const length = getCalendar(date.system).daysInMonth(year, month);
  return createDate(date.system, year, month, Math.min(date.day, length));
}
