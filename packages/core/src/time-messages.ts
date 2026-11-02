import type { TimeFieldLabels } from './time-types';

const EN: TimeFieldLabels = {
  time: 'Time',
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
  period: 'AM/PM',
  empty: 'Empty',
};

const MESSAGES: Record<string, TimeFieldLabels> = {
  en: EN,
  fa: {
    time: 'زمان',
    hour: 'ساعت',
    minute: 'دقیقه',
    second: 'ثانیه',
    period: 'قبل از ظهر / بعد از ظهر',
    empty: 'خالی',
  },
  de: {
    time: 'Uhrzeit',
    hour: 'Stunde',
    minute: 'Minute',
    second: 'Sekunde',
    period: 'AM/PM',
    empty: 'Leer',
  },
};

/** Texts for a locale's language, with English as the fallback and `overrides` on top. */
export function timeLabelsFor(
  locale: string,
  overrides?: Partial<TimeFieldLabels>,
): TimeFieldLabels {
  const language = new Intl.Locale(locale).language;
  return { ...(MESSAGES[language] ?? EN), ...overrides };
}
