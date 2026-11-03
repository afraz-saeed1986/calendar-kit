import { getCalendar } from './calendars/registry';
import { createDate } from './date';
import { normalizeDigits } from './digits';
import type { CalendarDate, CalendarSystem } from './types';

const MS_PER_DAY = 86_400_000;
const DEFAULT_LOCALE = 'en-US';

type DateField = 'year' | 'month' | 'day';

export interface DatePattern {
  /** The order of the fields in the locale, for example ['day', 'month', 'year'] for de-DE. */
  order: ReadonlyArray<DateField>;
  /** The text between the fields: "/", "." or "-". */
  separator: string;
}

export interface TextDateOptions {
  /** BCP 47 locale. Default: 'en-US'. */
  locale?: string;
  /** Calendar system of the date. Default: 'gregory'. */
  system?: CalendarSystem;
}

const patterns = new Map<string, DatePattern>();

/** How a locale writes a numeric date in a calendar system, read from `Intl`. */
export function datePatternOf(
  locale: string = DEFAULT_LOCALE,
  system: CalendarSystem = 'gregory',
): DatePattern {
  const key = `${locale}|${system}`;
  const cached = patterns.get(key);
  if (cached) return cached;

  const latin = new Intl.Locale(locale, { calendar: system, numberingSystem: 'latn' });
  const parts = new Intl.DateTimeFormat(latin.toString(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).formatToParts(new Date(0));

  const order: DateField[] = [];
  for (const part of parts) {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') order.push(part.type);
  }

  const pattern: DatePattern = {
    order: order.length === 3 ? order : ['year', 'month', 'day'],
    separator: parts.find((part) => part.type === 'literal')?.value.trim() || '/',
  };
  patterns.set(key, pattern);
  return pattern;
}

/**
 * Write a date the way the locale does, with its own numerals and no era text:
 * "10/14/2026" for en-US, "14.10.2026" for de-DE, "۱۴۰۵/۰۷/۲۲" for fa-IR in the Persian calendar.
 * The calendar system is the one of the date.
 */
export function formatDate(date: CalendarDate, locale: string = DEFAULT_LOCALE): string {
  const pattern = datePatternOf(locale, date.system);
  const epochDay = getCalendar(date.system).toEpochDay(date);
  const parts = new Intl.DateTimeFormat(
    new Intl.Locale(locale, { calendar: date.system }).toString(),
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    },
  ).formatToParts(new Date(epochDay * MS_PER_DAY));

  const read = (type: DateField) => parts.find((part) => part.type === type)?.value ?? '';
  return pattern.order.map(read).join(pattern.separator);
}

/**
 * Read a typed date. Latin, Persian and Arabic-Indic digits are accepted, and "/", "-", "." or
 * spaces between the numbers. The order of the fields follows the locale, except that text
 * starting with four digits is always year, month, day ("2026-10-14").
 *
 * Returns `null` for anything that is not a real date in the calendar system.
 */
export function parseDate(text: string, options: TextDateOptions = {}): CalendarDate | null {
  const { locale = DEFAULT_LOCALE, system = 'gregory' } = options;

  const match = /^(\d{1,4})[\s/.,-]+(\d{1,2})[\s/.,-]+(\d{1,4})[\s/.,-]*$/.exec(
    normalizeDigits(text).trim(),
  );
  if (!match) return null;
  const [, first, second, third] = match;
  if (first === undefined || second === undefined || third === undefined) return null;

  const order =
    first.length === 4 ? (['year', 'month', 'day'] as const) : datePatternOf(locale, system).order;
  const fields: Record<DateField, string> = { year: '', month: '', day: '' };
  [first, second, third].forEach((token, index) => {
    const field = order[index];
    if (field) fields[field] = token;
  });

  if (fields.year.length !== 4 || fields.month.length > 2 || fields.day.length > 2) return null;
  const year = Number(fields.year);
  const month = Number(fields.month);
  const day = Number(fields.day);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > getCalendar(system).daysInMonth(year, month)) return null;
  return createDate(system, year, month, day);
}
