import { describe, expect, it, vi } from 'vitest';
import { isDateSelectable, isRangeSelectable, isTimeSelectable } from '../src/selectable';

const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });
const time = (hour: number, minute = 0, second = 0) => ({ hour, minute, second });

describe('isDateSelectable', () => {
  it('accepts every day when there are no limits', () => {
    expect(isDateSelectable(oct(14))).toBe(true);
  });

  it('keeps the days inside minDate and maxDate, both included', () => {
    const limits = { minDate: oct(10), maxDate: oct(20) };
    expect(isDateSelectable(oct(9), limits)).toBe(false);
    expect(isDateSelectable(oct(10), limits)).toBe(true);
    expect(isDateSelectable(oct(20), limits)).toBe(true);
    expect(isDateSelectable(oct(21), limits)).toBe(false);
  });

  it('rejects a day that isDateUnavailable marks', () => {
    const options = { isDateUnavailable: (date: { day: number }) => date.day === 15 };
    expect(isDateSelectable(oct(15), options)).toBe(false);
    expect(isDateSelectable(oct(16), options)).toBe(true);
  });

  it('rejects a day that a plugin marks, and gives it the system and the locale', () => {
    const isDateUnavailable = vi.fn((date: { day: number }) => date.day === 15);
    const plugins = [{ name: 'holidays', isDateUnavailable }];
    expect(isDateSelectable(oct(15), { plugins, locale: 'fa-IR' })).toBe(false);
    expect(isDateSelectable(oct(16), { plugins, locale: 'fa-IR' })).toBe(true);
    expect(isDateUnavailable).toHaveBeenCalledWith(oct(15), {
      system: 'gregory',
      locale: 'fa-IR',
    });
  });
});

describe('isRangeSelectable', () => {
  const limits = { minDate: oct(10), maxDate: oct(20) };

  it('needs both ends to be selectable', () => {
    expect(isRangeSelectable({ start: oct(11), end: oct(19) }, limits)).toBe(true);
    expect(isRangeSelectable({ start: oct(9), end: oct(19) }, limits)).toBe(false);
    expect(isRangeSelectable({ start: oct(11), end: oct(21) }, limits)).toBe(false);
  });

  it('allows an unavailable day between the ends by default', () => {
    const options = { isDateUnavailable: (date: { day: number }) => date.day === 15 };
    expect(isRangeSelectable({ start: oct(12), end: oct(18) }, options)).toBe(true);
  });

  it('rejects an unavailable day between the ends when allowUnavailableInRange is false', () => {
    const options = {
      isDateUnavailable: (date: { day: number }) => date.day === 15,
      allowUnavailableInRange: false,
    };
    expect(isRangeSelectable({ start: oct(12), end: oct(18) }, options)).toBe(false);
    expect(isRangeSelectable({ start: oct(16), end: oct(18) }, options)).toBe(true);
  });

  it('rejects an unavailable end', () => {
    const options = { isDateUnavailable: (date: { day: number }) => date.day === 18 };
    expect(isRangeSelectable({ start: oct(12), end: oct(18) }, options)).toBe(false);
  });
});

describe('isTimeSelectable', () => {
  it('keeps the times inside minTime and maxTime, both included', () => {
    const limits = { minTime: time(9), maxTime: time(17, 30) };
    expect(isTimeSelectable(time(8, 59, 59), limits)).toBe(false);
    expect(isTimeSelectable(time(9), limits)).toBe(true);
    expect(isTimeSelectable(time(17, 30), limits)).toBe(true);
    expect(isTimeSelectable(time(17, 30, 1), limits)).toBe(false);
  });

  it('accepts every time when there are no limits', () => {
    expect(isTimeSelectable(time(23, 59, 59))).toBe(true);
  });
});
