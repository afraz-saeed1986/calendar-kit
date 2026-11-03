import { normalizeDigits } from './digits';
import { formatDate, parseDate, type TextDateOptions } from './text-date';
import type { DateTimeValue, HourCycle, TimeValue } from './time-types';

export interface TextTimeOptions {
  /** BCP 47 locale for numerals and AM/PM text. Default: 'en-US'. */
  locale?: string;
  /** 12 or 24. Default: the locale's own habit. */
  hourCycle?: HourCycle;
  /** Include seconds. Default: false. */
  seconds?: boolean;
}

/**
 * Write a time the way the locale does, with its own numerals:
 * "09:05" for de-DE, "09:05 AM" for en-US on a 12-hour clock, "۰۹:۰۵" for fa-IR.
 */
export function formatTime(time: TimeValue, options: TextTimeOptions = {}): string {
  const { locale = 'en-US', hourCycle, seconds = false } = options;
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: seconds ? '2-digit' : undefined,
    hourCycle: hourCycle === undefined ? undefined : hourCycle === 12 ? 'h12' : 'h23',
    timeZone: 'UTC',
  });
  return formatter.format(new Date(Date.UTC(2000, 0, 1, time.hour, time.minute, time.second)));
}

/**
 * Read a typed time: "09:05", "9:05", "09:05:30", "9:05 PM", "11:59 p.m.".
 * Latin, Persian and Arabic-Indic digits are accepted. With AM or PM the hour must be 1 to 12.
 * Returns `null` for anything that is not a valid time.
 */
export function parseTime(text: string): TimeValue | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm|a\.m\.|p\.m\.))?$/i.exec(
    normalizeDigits(text).trim(),
  );
  if (!match) return null;
  const [, hourText, minuteText, secondText, suffix] = match;
  if (hourText === undefined || minuteText === undefined) return null;

  let hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText === undefined ? 0 : Number(secondText);
  if (minute > 59 || second > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (suffix.toLowerCase().startsWith('p') ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return { hour, minute, second };
}

/** A date and a time written as one text, for example "10/14/2026 09:30". */
export function formatDateTime(value: DateTimeValue, options: TextTimeOptions = {}): string {
  return `${formatDate(value.date, options.locale)} ${formatTime(value.time, options)}`;
}

/**
 * Read a typed date and time, separated by a space or a "T": "10/14/2026 9:30 PM",
 * "2026-10-14T21:30". Returns `null` if either part is invalid.
 */
export function parseDateTime(text: string, options: TextDateOptions = {}): DateTimeValue | null {
  const match = /^(.*?)(?:\s+|T)(\d{1,2}:\d{2}.*)$/.exec(normalizeDigits(text).trim());
  if (!match) return null;
  const [, datePart, timePart] = match;
  if (datePart === undefined || timePart === undefined) return null;

  const date = parseDate(datePart, options);
  const time = parseTime(timePart);
  return date && time ? { date, time } : null;
}
