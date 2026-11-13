import { describe, expect, it } from 'vitest';
import { datesSelectedText, formatSelection, isEmptySelection, toSystem } from '../src/picker-text';
import type { CalendarDate } from '../src/types';

const day = (value: number): CalendarDate => ({ system: 'gregory', year: 2026, month: 10, day: value });

describe('isEmptySelection', () => {
  it('is true for null and an empty list only', () => {
    expect(isEmptySelection(null)).toBe(true);
    expect(isEmptySelection([])).toBe(true);
    expect(isEmptySelection(day(14))).toBe(false);
    expect(isEmptySelection({ start: day(14), end: day(21) })).toBe(false);
    expect(isEmptySelection([day(14)])).toBe(false);
  });
});

describe('toSystem', () => {
  it('keeps null and empty lists, and maps lists and ranges', () => {
    expect(toSystem(null, 'gregory')).toBeNull();
    expect(toSystem([], 'gregory')).toEqual([]);
    expect(toSystem(day(14), 'gregory')).toEqual(day(14));
    expect(toSystem([day(14), day(15)], 'gregory')).toEqual([day(14), day(15)]);
    expect(toSystem({ start: day(14), end: day(21) }, 'gregory')).toEqual({
      start: day(14),
      end: day(21),
    });
  });
});

describe('formatSelection', () => {
  it('writes nothing for an empty selection', () => {
    expect(formatSelection(null, 'en-US')).toBe('');
    expect(formatSelection([], 'en-US')).toBe('');
  });

  it('writes a date and a range', () => {
    expect(formatSelection(day(14), 'en-US')).toBe('10/14/2026');
    expect(formatSelection({ start: day(14), end: day(21) }, 'en-US')).toBe(
      '10/14/2026 \u2013 10/21/2026',
    );
  });

  it('lists up to three days in date order', () => {
    expect(formatSelection([day(14), day(12)], 'en-US')).toBe('10/12/2026, 10/14/2026');
  });

  it('uses the Persian comma between listed days for a Persian locale', () => {
    expect(formatSelection([day(14), day(12)], 'fa-IR')).toContain('\u060c ');
  });

  it('writes a count for a longer list', () => {
    const many = [day(1), day(2), day(3), day(4)];
    expect(formatSelection(many, 'en-US')).toBe('4 dates');
    expect(formatSelection(many, 'de-DE')).toBe('4 Daten');
    expect(formatSelection(many, 'fa-IR')).toContain('\u062a\u0627\u0631\u06cc\u062e');
    expect(formatSelection(many, 'en-US', (count) => `${count} days`)).toBe('4 days');
  });
});

describe('datesSelectedText', () => {
  it('falls back to English for a language that is not built in', () => {
    expect(datesSelectedText('ja-JP', 5)).toBe('5 dates');
  });
});
