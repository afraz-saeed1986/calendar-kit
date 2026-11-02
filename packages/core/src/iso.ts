import { getCalendar } from './calendars/registry';
import { convertDate } from './date';
import type { TimeValue } from './time-types';
import type { CalendarDate, CalendarSystem } from './types';

const pad = (value: number, length: number) => String(value).padStart(length, '0');

/**
 * ISO 8601 date ("2026-10-14"). ISO dates are always Gregorian, so a date in another
 * calendar system is converted first. This is the value to send to a server or store.
 */
export function formatISODate(date: CalendarDate): string {
  const gregorian = convertDate(date, 'gregory');
  return `${pad(gregorian.year, 4)}-${pad(gregorian.month, 2)}-${pad(gregorian.day, 2)}`;
}

/**
 * Read an ISO 8601 date ("2026-10-14"). The result is in the given calendar system
 * (default: Gregorian, other systems must be registered). Returns `null` for anything
 * that is not a real date.
 */
export function parseISODate(
  text: string,
  system: CalendarSystem = 'gregory',
): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > getCalendar('gregory').daysInMonth(year, month)) return null;

  return convertDate({ system: 'gregory', year, month, day }, system);
}

/** ISO 8601 time: "09:05", or "09:05:30" with `seconds: true`. */
export function formatISOTime(time: TimeValue, options: { seconds?: boolean } = {}): string {
  const base = `${pad(time.hour, 2)}:${pad(time.minute, 2)}`;
  return options.seconds ? `${base}:${pad(time.second, 2)}` : base;
}

/** Read an ISO 8601 time ("09:05" or "09:05:30"). Returns `null` if it is not a valid time. */
export function parseISOTime(text: string): TimeValue | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  if (hour > 23 || minute > 59 || second > 59) return null;

  return { hour, minute, second };
}
