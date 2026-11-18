import { compareDates } from './date';
import { SEPARATOR, SEPARATORS } from './text-range';
import type { TextDateOptions } from './text-date';
import { formatDateTime, parseDateTime, type TextTimeOptions } from './text-time';
import type { DateTimeValue, TimeValue } from './time-types';

/** A start and an end, each with a date and a time. */
export interface DateTimeRange {
  start: DateTimeValue;
  end: DateTimeValue;
}

/** What a `DateTimePicker` can select: one date and time, or a range of them. */
export type DateTimeMode = 'single' | 'range';

/** The value of a `DateTimePicker`. It follows the mode, and `null` means nothing. */
export type DateTimePickerValue<M extends DateTimeMode = 'single'> = M extends 'range'
  ? DateTimeRange | null
  : DateTimeValue | null;

const toSeconds = (time: TimeValue) => time.hour * 3600 + time.minute * 60 + time.second;

/** True when `a` is later than `b`: by date, then by time of day. */
function isAfter(a: DateTimeValue, b: DateTimeValue): boolean {
  const byDate = compareDates(a.date, b.date);
  return byDate > 0 || (byDate === 0 && toSeconds(a.time) > toSeconds(b.time));
}

/**
 * Keep a range in order: when the end is before the start (the same day, a later start time), the
 * end becomes the start. The same object is returned when nothing has to change (ADR 0023).
 */
export function stickEndToStart(range: DateTimeRange): DateTimeRange {
  return isAfter(range.start, range.end) ? { start: range.start, end: range.start } : range;
}

/**
 * Write a range the way `formatDateTime` writes each end, with the en dash of `formatDateRange`
 * between them: "10/14/2026 09:30 AM – 10/21/2026 05:00 PM" for en-US.
 */
export function formatDateTimeRange(range: DateTimeRange, options: TextTimeOptions = {}): string {
  return `${formatDateTime(range.start, options)}${SEPARATOR}${formatDateTime(range.end, options)}`;
}

/**
 * Read a typed range of two dates with times (see `parseDateTime` for each end and
 * `parseDateRange` for the separators). If the end is before the start, the two are swapped.
 *
 * Returns `null` for anything else, including a text with only one end.
 */
export function parseDateTimeRange(
  text: string,
  options: TextDateOptions = {},
): DateTimeRange | null {
  const parts = text.trim().split(SEPARATORS);
  if (parts.length !== 2) return null;

  const [first, second] = parts.map((part) => parseDateTime(part, options));
  if (!first || !second) return null;
  return isAfter(first, second) ? { start: second, end: first } : { start: first, end: second };
}