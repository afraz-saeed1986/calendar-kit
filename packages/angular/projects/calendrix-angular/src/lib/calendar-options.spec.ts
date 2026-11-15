import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDate } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixCalendar } from './calendar';

@Component({
  imports: [CalendrixCalendar],
  template: `<calendrix-calendar
    [now]="now"
    [minDate]="minDate()"
    [isDateUnavailable]="unavailable()"
  />`,
})
class Host {
  readonly now = () => new Date(2026, 9, 14);
  readonly minDate = signal<CalendarDate | undefined>({
    system: 'gregory',
    year: 2026,
    month: 10,
    day: 10,
  });
  readonly unavailable = signal<((date: CalendarDate) => boolean) | undefined>(
    (date) => date.day === 5,
  );
}

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** A day of October 2026 (the days of September and November are marked as outside). */
function octoberDay(fixture: ComponentFixture<unknown>, label: string): HTMLElement {
  const days = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '.calendrix-day:not([data-outside-month])',
    ),
  );
  const found = days.find((day) => day.textContent?.trim() === label);
  if (!found) throw new Error(`No day ${label}`);
  return found;
}

describe('options that go back to undefined', () => {
  it('clears minDate', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(octoberDay(fixture, '5').getAttribute('aria-disabled')).toBe('true');

    fixture.componentInstance.minDate.set(undefined);
    await settle(fixture);
    // Day 5 is also "unavailable" through isDateUnavailable, so look at day 6.
    expect(octoberDay(fixture, '6').getAttribute('aria-disabled')).toBeNull();
  });

  it('clears isDateUnavailable', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.minDate.set(undefined);
    await settle(fixture);
    expect(octoberDay(fixture, '5').getAttribute('aria-disabled')).toBe('true');

    fixture.componentInstance.unavailable.set(undefined);
    await settle(fixture);
    expect(octoberDay(fixture, '5').getAttribute('aria-disabled')).toBeNull();
  });
});