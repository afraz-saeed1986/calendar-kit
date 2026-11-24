import { cachedLocale } from './intl-cache';

/** Texts the pickers put on their own buttons. */
export interface PickerLabels {
  /** The button that opens the calendar. */
  openCalendar: string;
  /** The name of the popover dialog. */
  dialog: string;
  clear: string;
  done: string;
  /** A range with times: the name of the time field of the start. */
  startTime: string;
  /** A range with times: the name of the time field of the end. */
  endTime: string;
}

/** Which picker the texts are for: a date picker has no time. */
export type PickerKind = 'date' | 'dateTime';

const EN: PickerLabels = {
  openCalendar: 'Choose date and time',
  dialog: 'Choose date and time',
  clear: 'Clear',
  done: 'Done',
  startTime: 'Start time',
  endTime: 'End time',
};

const MESSAGES: Record<string, PickerLabels> = {
  en: EN,
  fa: {
    openCalendar: 'انتخاب تاریخ و زمان',
    dialog: 'انتخاب تاریخ و زمان',
    clear: 'پاک کردن',
    done: 'تأیید',
    startTime: 'زمان شروع',
    endTime: 'زمان پایان',
  },
  de: {
    openCalendar: 'Datum und Uhrzeit wählen',
    dialog: 'Datum und Uhrzeit wählen',
    clear: 'Löschen',
    done: 'Fertig',
    startTime: 'Startzeit',
    endTime: 'Endzeit',
  },
};

/** The two texts that change for a picker without time. */
const DATE_ONLY: Record<string, Pick<PickerLabels, 'openCalendar' | 'dialog'>> = {
  en: { openCalendar: 'Choose date', dialog: 'Choose date' },
  fa: { openCalendar: 'انتخاب تاریخ', dialog: 'انتخاب تاریخ' },
  de: { openCalendar: 'Datum wählen', dialog: 'Datum wählen' },
};

/**
 * Texts for a locale's language, with English as the fallback and `overrides` on top. `kind` is
 * `'dateTime'` (default) or `'date'` for a picker without time.
 */
export function pickerLabelsFor(
  locale: string,
  overrides?: Partial<PickerLabels>,
  kind: PickerKind = 'dateTime',
): PickerLabels {
  const language = cachedLocale(locale).language;
  const base = MESSAGES[language] ?? EN;
  const dateOnly = kind === 'date' ? (DATE_ONLY[language] ?? DATE_ONLY['en']) : undefined;
  return { ...base, ...dateOnly, ...overrides };
}
