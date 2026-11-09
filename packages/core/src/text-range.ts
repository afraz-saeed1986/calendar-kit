import { compareDates } from './date';
import { formatDate, parseDate, type TextDateOptions } from './text-date';
import type { DateRange } from './types';

const DEFAULT_LOCALE = 'en-US';

/** What `formatDateRange` writes between the two dates: an en dash with spaces. */
const SEPARATOR = ' \u2013 ';

/**
 * The separators accepted between the two dates: an en dash or an em dash (with or without
 * spaces), a hyphen with spaces around it, and the words "to", "تا" (Persian) and "bis" (German)
 * with spaces around them. A hyphen without spaces is not one: it can be part of a date.
 */
const SEPARATORS = /\s*[\u2013\u2014]\s*|\s+-\s+|\s+(?:to|تا|bis)\s+/i;

/**
 * Write a range the way the locale writes dates, with an en dash between them:
 * "11/18/2026 – 11/25/2026" for en-US.
 */
export function formatDateRange(range: DateRange, locale: string = DEFAULT_LOCALE): string {
  return `${formatDate(range.start, locale)}${SEPARATOR}${formatDate(range.end, locale)}`;
}

/**
 * Read a typed range of two dates (see `parseDate` for how each date is read). If the end is
 * before the start, the two are swapped, as when a range is picked in a calendar.
 *
 * Returns `null` for anything else, including a text with only one date.
 */
export function parseDateRange(text: string, options: TextDateOptions = {}): DateRange | null {
  const parts = text.trim().split(SEPARATORS);
  if (parts.length !== 2) return null;

  const [first, second] = parts.map((part) => parseDate(part, options));
  if (!first || !second) return null;
  return compareDates(first, second) <= 0 ? { start: first, end: second } : { start: second, end: first };
}