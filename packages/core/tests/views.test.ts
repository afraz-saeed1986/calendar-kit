import { describe, expect, it } from 'vitest';
import { createDate } from '../src';
import { viewLabelsFor } from '../src/view-messages';
import { decadeStart, withMonth, yearPageOf } from '../src/views';

describe('decadeStart', () => {
  it.each([
    [1405, 1400],
    [1400, 1400],
    [1399, 1390],
    [2026, 2020],
    [0, 0],
    [-1, -10],
  ])('decadeStart(%i) = %i', (year, expected) => {
    expect(decadeStart(year)).toBe(expected);
  });
});

describe('yearPageOf', () => {
  it('has 12 years: the decade plus one year on each side', () => {
    const page = yearPageOf(1405);
    expect(page).toHaveLength(12);
    expect(page[0]).toBe(1399);
    expect(page[1]).toBe(1400);
    expect(page[10]).toBe(1409);
    expect(page[11]).toBe(1410);
  });

  it('is the same page for every year of a decade', () => {
    expect(yearPageOf(2020)).toEqual(yearPageOf(2029));
    expect(yearPageOf(2029)).not.toEqual(yearPageOf(2030));
  });
});

describe('withMonth', () => {
  it('keeps the day when the month is long enough', () => {
    expect(withMonth(createDate('gregory', 2026, 10, 14), 2026, 12)).toEqual(
      createDate('gregory', 2026, 12, 14),
    );
  });

  it('clamps the day to the end of a shorter month', () => {
    expect(withMonth(createDate('gregory', 2026, 1, 31), 2026, 2)).toEqual(
      createDate('gregory', 2026, 2, 28),
    );
    expect(withMonth(createDate('gregory', 2024, 1, 31), 2024, 2)).toEqual(
      createDate('gregory', 2024, 2, 29),
    );
  });

  it('works when the year changes too', () => {
    expect(withMonth(createDate('gregory', 2024, 2, 29), 2025, 2)).toEqual(
      createDate('gregory', 2025, 2, 28),
    );
  });
});

describe('viewLabelsFor', () => {
  it('has texts in English, Persian and German', () => {
    expect(viewLabelsFor('en-US').chooseYear).toBe('Choose year');
    expect(viewLabelsFor('fa-IR').chooseYear).toBe('انتخاب سال');
    expect(viewLabelsFor('de-DE').chooseYear).toBe('Jahr wählen');
  });

  it('falls back to English and accepts overrides', () => {
    expect(viewLabelsFor('ja-JP').nextDecade).toBe('Next 10 years');
    expect(viewLabelsFor('en-US', { nextDecade: '+10' }).nextDecade).toBe('+10');
  });
});
