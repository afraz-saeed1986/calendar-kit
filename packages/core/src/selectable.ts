import { getCalendar } from './calendars/registry';
import type { TimeValue } from './time-types';
import type { CalendarDate, CalendarPlugin, CalendarSystem, DateRange } from './types';

/** What decides whether a typed value is one the user could pick (ADR 0025). */
export interface SelectableOptions {
  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  isDateUnavailable?: (date: CalendarDate) => boolean;
  plugins?: CalendarPlugin[];
  /** The context of the plugins. Default: 'en-US'. */
  locale?: string;
  /** The context of the plugins. Default: the system of the date. */
  system?: CalendarSystem;
  /** `false`: a range may not hold an unavailable day. Default: it may, as in `Calendar`. */
  allowUnavailableInRange?: boolean;
  minTime?: TimeValue;
  maxTime?: TimeValue;
}

const epochDayOf = (date: CalendarDate): number => getCalendar(date.system).toEpochDay(date);

const toSeconds = (time: TimeValue): number => time.hour * 3600 + time.minute * 60 + time.second;

/** Marked by `isDateUnavailable` or by a plugin, as `Calendar` marks a day. */
function isUnavailable(date: CalendarDate, options: SelectableOptions): boolean {
  if (options.isDateUnavailable?.(date) === true) return true;
  const context = { system: options.system ?? date.system, locale: options.locale ?? 'en-US' };
  return (options.plugins ?? []).some(
    (plugin) => plugin.isDateUnavailable?.(date, context) === true,
  );
}

/**
 * True when the user could pick this day in a calendar: it is inside `minDate`..`maxDate` and
 * neither `isDateUnavailable` nor a plugin marks it. Dates in different calendar systems compare
 * right, because the comparison uses epoch days.
 */
export function isDateSelectable(date: CalendarDate, options: SelectableOptions = {}): boolean {
  const day = epochDayOf(date);
  if (options.minDate && day < epochDayOf(options.minDate)) return false;
  if (options.maxDate && day > epochDayOf(options.maxDate)) return false;
  return !isUnavailable(date, options);
}

/**
 * True when the user could pick this range: both ends are selectable. The days between may be
 * unavailable, unless `allowUnavailableInRange` is `false`.
 */
export function isRangeSelectable(range: DateRange, options: SelectableOptions = {}): boolean {
  if (!isDateSelectable(range.start, options) || !isDateSelectable(range.end, options)) {
    return false;
  }
  if (options.allowUnavailableInRange !== false) return true;

  const calendar = getCalendar(range.start.system);
  const first = Math.min(epochDayOf(range.start), epochDayOf(range.end));
  const last = Math.max(epochDayOf(range.start), epochDayOf(range.end));
  for (let day = first; day <= last; day++) {
    if (isUnavailable(calendar.fromEpochDay(day), options)) return false;
  }
  return true;
}

/** True when the time is inside `minTime`..`maxTime`, both included, as in `TimeField`. */
export function isTimeSelectable(time: TimeValue, options: SelectableOptions = {}): boolean {
  if (options.minTime && toSeconds(time) < toSeconds(options.minTime)) return false;
  if (options.maxTime && toSeconds(time) > toSeconds(options.maxTime)) return false;
  return true;
}