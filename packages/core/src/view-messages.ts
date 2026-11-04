import type { ViewLabels } from './view-types';

const EN: ViewLabels = {
  previousYear: 'Previous year',
  nextYear: 'Next year',
  previousDecade: 'Previous 10 years',
  nextDecade: 'Next 10 years',
  chooseMonth: 'Choose month',
  chooseYear: 'Choose year',
};

const MESSAGES: Record<string, ViewLabels> = {
  en: EN,
  fa: {
    previousYear: 'سال قبل',
    nextYear: 'سال بعد',
    previousDecade: 'ده سال قبل',
    nextDecade: 'ده سال بعد',
    chooseMonth: 'انتخاب ماه',
    chooseYear: 'انتخاب سال',
  },
  de: {
    previousYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    previousDecade: 'Vorherige 10 Jahre',
    nextDecade: 'Nächste 10 Jahre',
    chooseMonth: 'Monat wählen',
    chooseYear: 'Jahr wählen',
  },
};

/** Texts for a locale's language, with English as the fallback and `overrides` on top. */
export function viewLabelsFor(locale: string, overrides?: Partial<ViewLabels>): ViewLabels {
  const language = new Intl.Locale(locale).language;
  return { ...(MESSAGES[language] ?? EN), ...overrides };
}
