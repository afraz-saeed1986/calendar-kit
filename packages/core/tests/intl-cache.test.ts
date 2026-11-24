import { describe, expect, it } from 'vitest';
import { dateTimeFormat, cachedLocale, numberFormat } from '../src/intl-cache';

describe('intl cache', () => {
  it('gives the same object for the same arguments', () => {
    expect(dateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })).toBe(
      dateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }),
    );
    expect(numberFormat('fa-IR', { useGrouping: false })).toBe(
      numberFormat('fa-IR', { useGrouping: false }),
    );
    expect(cachedLocale('fa-IR', { calendar: 'persian' })).toBe(
      cachedLocale('fa-IR', { calendar: 'persian' }),
    );
  });

  it('gives another object when the locale or an option differs', () => {
    expect(dateTimeFormat('en-US', { month: 'long' })).not.toBe(
      dateTimeFormat('de-DE', { month: 'long' }),
    );
    expect(dateTimeFormat('en-US', { month: 'long' })).not.toBe(
      dateTimeFormat('en-US', { month: 'short' }),
    );
  });

  it('formats like a new Intl object', () => {
    const date = new Date(Date.UTC(2026, 9, 14));
    const options = { month: 'long', year: 'numeric', timeZone: 'UTC' } as const;
    expect(dateTimeFormat('de-DE', options).format(date)).toBe(
      new Intl.DateTimeFormat('de-DE', options).format(date),
    );
    expect(numberFormat('fa-IR').format(1405)).toBe(new Intl.NumberFormat('fa-IR').format(1405));
    expect(cachedLocale('fa-IR').language).toBe('fa');
  });
});
