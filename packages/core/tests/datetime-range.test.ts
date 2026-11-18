import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../src/text-time';
import {
  formatDateTimeRange,
  parseDateTimeRange,
  stickEndToStart,
  type DateTimeRange,
} from '../src/datetime-range';
import { pickerLabelsFor } from '../src/picker-labels';

const at = (day: number, hour: number, minute = 0) => ({
  date: { system: 'gregory' as const, year: 2026, month: 10, day },
  time: { hour, minute, second: 0 },
});
const range: DateTimeRange = { start: at(14, 9, 30), end: at(21, 17, 0) };
const EN_DASH = '\u2013';

describe('formatDateTimeRange', () => {
  it('joins the two ends with an en dash', () => {
    const options = { locale: 'en-US', hourCycle: 24 as const };
    expect(formatDateTimeRange(range, options)).toBe(
      `${formatDateTime(range.start, options)} ${EN_DASH} ${formatDateTime(range.end, options)}`,
    );
  });
});

describe('parseDateTimeRange', () => {
  it.each([
    ['en-US', 24 as const],
    ['en-US', 12 as const],
    ['de-DE', 24 as const],
  ])('reads what formatDateTimeRange writes (%s, %s-hour)', (locale, hourCycle) => {
    const text = formatDateTimeRange(range, { locale, hourCycle });
    expect(parseDateTimeRange(text, { locale, system: 'gregory' })).toEqual(range);
  });

  it('accepts a spaced hyphen and the word "to" between the ends', () => {
    const options = { locale: 'en-US', system: 'gregory' as const };
    expect(parseDateTimeRange('10/14/2026 09:30 - 10/21/2026 17:00', options)).toEqual(range);
    expect(parseDateTimeRange('10/14/2026 09:30 to 10/21/2026 17:00', options)).toEqual(range);
  });

  it('swaps the ends when the end is earlier', () => {
    const options = { locale: 'en-US', system: 'gregory' as const };
    expect(parseDateTimeRange('10/21/2026 17:00 - 10/14/2026 09:30', options)).toEqual(range);
    expect(parseDateTimeRange('10/14/2026 17:00 - 10/14/2026 09:30', options)).toEqual({
      start: at(14, 9, 30),
      end: at(14, 17, 0),
    });
  });

  it('returns null for one end or for text that is not a range', () => {
    const options = { locale: 'en-US', system: 'gregory' as const };
    expect(parseDateTimeRange('10/14/2026 09:30', options)).toBeNull();
    expect(parseDateTimeRange('10/14/2026 - 10/21/2026', options)).toBeNull();
    expect(parseDateTimeRange('abc', options)).toBeNull();
    expect(parseDateTimeRange('', options)).toBeNull();
  });
});

describe('stickEndToStart', () => {
  it('returns the same range when it is in order', () => {
    expect(stickEndToStart(range)).toBe(range);
    const sameTime = { start: at(14, 9, 30), end: at(14, 9, 30) };
    expect(stickEndToStart(sameTime)).toBe(sameTime);
  });

  it('puts the end on the start when the end is earlier on the same day', () => {
    const result = stickEndToStart({ start: at(14, 17, 0), end: at(14, 9, 30) });
    expect(result).toEqual({ start: at(14, 17, 0), end: at(14, 17, 0) });
  });

  it('does not touch an earlier time of day on a later day', () => {
    const later = { start: at(14, 17, 0), end: at(15, 9, 30) };
    expect(stickEndToStart(later)).toBe(later);
  });
});

describe('picker labels for a range', () => {
  it('has the names of the two time fields in en, fa and de', () => {
    expect(pickerLabelsFor('en-US').startTime).toBe('Start time');
    expect(pickerLabelsFor('de-DE').endTime).toBe('Endzeit');
    expect(pickerLabelsFor('fa-IR').startTime).toBeTruthy();
    expect(pickerLabelsFor('en-US', { endTime: 'Until' }).endTime).toBe('Until');
  });
});