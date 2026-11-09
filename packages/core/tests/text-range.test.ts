import { describe, expect, it } from 'vitest';
import { createDate } from '../src/date';
import { formatDateRange, parseDateRange } from '../src/text-range';

const start = createDate('gregory', 2026, 11, 18);
const end = createDate('gregory', 2026, 11, 25);

describe('formatDateRange', () => {
  it('writes both dates with an en dash', () => {
    expect(formatDateRange({ start, end }, 'en-US')).toBe('11/18/2026 \u2013 11/25/2026');
  });

  it('follows the order and separator of the locale', () => {
    expect(formatDateRange({ start, end }, 'de-DE')).toBe('18.11.2026 \u2013 25.11.2026');
  });
});

describe('parseDateRange', () => {
  it.each([
    '11/18/2026 \u2013 11/25/2026',
    '11/18/2026\u201311/25/2026',
    '11/18/2026 \u2014 11/25/2026',
    '11/18/2026 - 11/25/2026',
    '11/18/2026 to 11/25/2026',
    '11/18/2026 TO 11/25/2026',
  ])('reads %s', (text) => {
    expect(parseDateRange(text, { locale: 'en-US' })).toEqual({ start, end });
  });

  it('reads ISO dates, which contain hyphens', () => {
    expect(parseDateRange('2026-11-18 \u2013 2026-11-25')).toEqual({ start, end });
  });

  it('follows the order of the fields of the locale', () => {
    expect(parseDateRange('18.11.2026 \u2013 25.11.2026', { locale: 'de-DE' })).toEqual({
      start,
      end,
    });
  });

  it('swaps the dates when the end is before the start', () => {
    expect(parseDateRange('11/25/2026 \u2013 11/18/2026')).toEqual({ start, end });
  });

  it('accepts a range of one day', () => {
    expect(parseDateRange('11/18/2026 \u2013 11/18/2026')).toEqual({ start, end: start });
  });

  it.each([
    '11/18/2026-11/25/2026',
    '11/18/2026',
    '11/18/2026 \u2013',
    '11/1/2026 \u2013 11/2/2026 \u2013 11/3/2026',
    '11/18/2026 \u2013 13/45/2026',
    'hello',
  ])('returns null for %s', (text) => {
    expect(parseDateRange(text)).toBeNull();
  });
});