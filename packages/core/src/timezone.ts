import { convertDate } from './date';
import type { DateTimeValue } from './time-types';
import type { CalendarSystem } from './types';

const MS_PER_DAY = 86_400_000;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Created once per time zone: constructing an Intl.DateTimeFormat is expensive. */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** What a wall clock in `timeZone` shows at the given instant. */
function wallClockAt(instantMs: number, timeZone: string | undefined): WallClock {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs));
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/** Offset of the time zone from UTC at an instant, in milliseconds (positive east of UTC). */
function offsetAt(instantMs: number, timeZone: string | undefined): number {
  const w = wallClockAt(instantMs, timeZone);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return wallAsUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * The instant at which a wall clock in `timeZone` shows the given date and time.
 * Without a time zone, the runtime's time zone is used.
 *
 * Around daylight saving changes a wall time can be missing or happen twice:
 * - a missing time (clocks jump forward) moves forward by the length of the gap,
 *   so 02:30 on a day when 02:00 becomes 03:00 gives 03:30;
 * - a repeated time (clocks go back) gives the first of the two instants.
 */
export function toInstant(value: DateTimeValue, timeZone?: string): Date {
  const gregorian = convertDate(value.date, 'gregory');
  const { hour, minute, second } = value.time;
  const wallMs = Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day, hour, minute, second);

  // The offsets a day before and after tell us whether a change happens near this wall time.
  const before = offsetAt(wallMs - MS_PER_DAY, timeZone);
  const after = offsetAt(wallMs + MS_PER_DAY, timeZone);
  const usingBefore = wallMs - before;
  if (before === after) return new Date(usingBefore);

  const usingAfter = wallMs - after;
  const beforeIsValid = offsetAt(usingBefore, timeZone) === before;
  const afterIsValid = offsetAt(usingAfter, timeZone) === after;

  if (beforeIsValid && afterIsValid) return new Date(Math.min(usingBefore, usingAfter));
  if (afterIsValid) return new Date(usingAfter);
  // Valid with the offset before the change, or missing: both resolve with that offset.
  return new Date(usingBefore);
}

/**
 * The date and time a wall clock in `timeZone` shows at an instant, with the date in the
 * given calendar system (which must be registered). Without a time zone, the runtime's is used.
 */
export function fromInstant(
  instant: Date,
  timeZone?: string,
  system: CalendarSystem = 'gregory',
): DateTimeValue {
  const w = wallClockAt(instant.getTime(), timeZone);
  return {
    date: convertDate({ system: 'gregory', year: w.year, month: w.month, day: w.day }, system),
    time: { hour: w.hour, minute: w.minute, second: w.second },
  };
}
