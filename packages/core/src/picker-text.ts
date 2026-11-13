import { compareDates, convertDate } from './date';
import { formatDate } from './text-date';
import { formatDateRange } from './text-range';
import type { CalendarSystem, Selection } from './types';

/** With more days than this, the input shows a count instead of the dates. */
const MAX_LISTED = 3;

const english = (count: string) => `${count} dates`;

/** "5 dates": the text of a long list of days, for the languages built in. */
const DATES_SELECTED: Record<string, (count: string) => string> = {
  en: english,
  fa: (count) => `${count} \u062a\u0627\u0631\u06cc\u062e`,
  de: (count) => `${count} Daten`,
};

/** The text of a long list of days ("5 dates"). `custom` replaces the built-in texts. */
export function datesSelectedText(
  locale: string,
  count: number,
  custom?: (count: number) => string,
): string {
  if (custom) return custom(count);
  const language = locale.split('-')[0]?.toLowerCase() ?? 'en';
  const text = DATES_SELECTED[language] ?? english;
  return text(new Intl.NumberFormat(locale).format(count));
}

/** True for `null` and for an empty list: nothing is selected. */
export function isEmptySelection(value: Selection): boolean {
  return value === null || (Array.isArray(value) && value.length === 0);
}

/** The selection in the calendar system on screen. */
export function toSystem(value: Selection, system: CalendarSystem): Selection {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((date) => convertDate(date, system));
  if ('start' in value) {
    return { start: convertDate(value.start, system), end: convertDate(value.end, system) };
  }
  return convertDate(value, system);
}

/** The text of the input: a date, a range, or the dates of a list (a count when it is long). */
export function formatSelection(
  value: Selection,
  locale: string,
  customCount?: (count: number) => string,
): string {
  if (value === null) return '';
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.length > MAX_LISTED) return datesSelectedText(locale, value.length, customCount);
    const separator = locale.toLowerCase().startsWith('fa') ? '\u060c ' : ', ';
    return [...value]
      .sort(compareDates)
      .map((date) => formatDate(date, locale))
      .join(separator);
  }
  if ('start' in value) return formatDateRange(value, locale);
  return formatDate(value, locale);
}
