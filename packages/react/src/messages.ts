/** Texts the picker puts on its own buttons. */
export interface PickerLabels {
  /** The button that opens the calendar. */
  openCalendar: string;
  /** The name of the popover dialog. */
  dialog: string;
  clear: string;
  done: string;
}

const EN: PickerLabels = {
  openCalendar: 'Choose date and time',
  dialog: 'Choose date and time',
  clear: 'Clear',
  done: 'Done',
};

const MESSAGES: Record<string, PickerLabels> = {
  en: EN,
  fa: {
    openCalendar: 'انتخاب تاریخ و زمان',
    dialog: 'انتخاب تاریخ و زمان',
    clear: 'پاک کردن',
    done: 'تأیید',
  },
  de: {
    openCalendar: 'Datum und Uhrzeit wählen',
    dialog: 'Datum und Uhrzeit wählen',
    clear: 'Löschen',
    done: 'Fertig',
  },
};

/** Texts for a locale's language, with English as the fallback and `overrides` on top. */
export function pickerLabelsFor(locale: string, overrides?: Partial<PickerLabels>): PickerLabels {
  const language = new Intl.Locale(locale).language;
  return { ...(MESSAGES[language] ?? EN), ...overrides };
}
