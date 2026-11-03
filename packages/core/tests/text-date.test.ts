import { describe, expect, it } from 'vitest';
import { createDate } from '../src';
import { normalizeDigits } from '../src/digits';
import { datePatternOf, formatDate, parseDate } from '../src/text-date';

const oct14 = createDate('gregory', 2026, 10, 14);

describe('normalizeDigits', () => {
  it('turns Persian and Arabic-Indic digits into Latin digits', () => {
    expect(normalizeDigits('۱۴۰۵/٠٧/22')).toBe('1405/07/22');
  });
});

describe('datePatternOf', () => {
  it.each([
    ['en-US', ['month', 'day', 'year'], '/'],
    ['de-DE', ['day', 'month', 'year'], '.'],
    ['sv-SE', ['year', 'month', 'day'], '-'],
  ])('reads the pattern of %s', (locale, order, separator) => {
    expect(datePatternOf(locale, 'gregory')).toEqual({ order, separator });
  });
});

describe('formatDate', () => {
  it.each([
    ['en-US', '10/14/2026'],
    ['de-DE', '14.10.2026'],
    ['sv-SE', '2026-10-14'],
  ])('writes a date for %s', (locale, expected) => {
    expect(formatDate(oct14, locale)).toBe(expected);
  });
});

describe('parseDate', () => {
  it.each([
    ['10/14/2026', 'en-US'],
    ['14.10.2026', 'de-DE'],
    ['2026-10-14', 'en-US'], // four digits first: always year, month, day
    ['٢٠٢٦/١٠/١٤', 'en-US'], // Arabic-Indic digits
  ])('reads "%s" in %s', (text, locale) => {
    expect(parseDate(text, { locale })).toEqual(oct14);
  });

  it.each(['02/30/2026', '13/01/2026', 'hello', '10/14/26', '', '10/14', '10/14/2026 extra'])(
    'returns null for "%s"',
    (text) => {
      expect(parseDate(text, { locale: 'en-US' })).toBeNull();
    },
  );

  it('round-trips through formatDate', () => {
    for (const locale of ['en-US', 'de-DE', 'sv-SE']) {
      for (const date of [
        oct14,
        createDate('gregory', 2024, 2, 29),
        createDate('gregory', 2026, 1, 1),
      ]) {
        expect(parseDate(formatDate(date, locale), { locale })).toEqual(date);
      }
    }
  });
});
