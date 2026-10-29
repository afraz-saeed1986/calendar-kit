import type { CalendarLabels } from './types';

const EN: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

/** Built-in texts by language. Other languages fall back to English; pass `labels` to override. */
const MESSAGES: Record<string, CalendarLabels> = {
  en: EN,
  fa: { previousMonth: 'ماه قبل', nextMonth: 'ماه بعد' },
  de: { previousMonth: 'Vorheriger Monat', nextMonth: 'Nächster Monat' },
};

export function labelsFor(locale: string, overrides?: Partial<CalendarLabels>): CalendarLabels {
  const language = new Intl.Locale(locale).language;
  return { ...(MESSAGES[language] ?? EN), ...overrides };
}
