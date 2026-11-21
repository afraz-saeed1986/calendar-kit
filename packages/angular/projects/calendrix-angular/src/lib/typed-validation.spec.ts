import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDate, DateRange, DateTimeRange, DateTimeValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixDatePicker } from './date-picker';
import { CalendrixDateTimePicker } from './date-time-picker';

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const DASH = '\u2013';

const oct = (day: number): CalendarDate => ({ system: 'gregory', year: 2026, month: 10, day });
const at = (day: number, hour: number, minute = 0): DateTimeValue => ({
  date: oct(day),
  time: { hour, minute, second: 0 },
});

class Limits {
  now = now;
  min = oct(10);
  max = oct(20);
  unavailable = (date: CalendarDate) => date.day === 15;
  minTime = { hour: 9, minute: 0, second: 0 };
  maxTime = { hour: 17, minute: 0, second: 0 };
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker
    locale="en-US"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
    [isDateUnavailable]="unavailable"
    [(value)]="value"
  />`,
})
class HostDay extends Limits {
  value = signal<CalendarDate | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker
    [selection]="'range'"
    locale="en-US"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
    [isDateUnavailable]="unavailable"
    [(value)]="value"
  />`,
})
class HostRange extends Limits {
  value = signal<DateRange | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker
    [selection]="'range'"
    locale="en-US"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
    [isDateUnavailable]="unavailable"
    [allowUnavailableInRange]="false"
    [(value)]="value"
  />`,
})
class HostRangeStrict extends Limits {
  value = signal<DateRange | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker
    locale="en-US"
    [hourCycle]="24"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
    [isDateUnavailable]="unavailable"
    [minTime]="minTime"
    [maxTime]="maxTime"
    [(value)]="value"
  />`,
})
class HostDateTime extends Limits {
  value = signal<DateTimeValue | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker
    [selection]="'range'"
    locale="en-US"
    [hourCycle]="24"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
    [isDateUnavailable]="unavailable"
    [minTime]="minTime"
    [maxTime]="maxTime"
    [(value)]="value"
  />`,
})
class HostDateTimeRange extends Limits {
  value = signal<DateTimeRange | null | undefined>(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function setup<T>(host: Type<T>): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(host);
  await settle(fixture);
  return fixture;
}

const input = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.calendrix-input')!;

async function typeText(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const element = input(fixture);
  element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

describe('CalendrixDatePicker: a typed date must be one the user could pick (ADR 0025)', () => {
  it('accepts a day inside the limits', async () => {
    const fixture = await setup(HostDay);
    await typeText(fixture, '10/14/2026');
    expect(fixture.componentInstance.value()).toEqual(oct(14));
  });

  it('ignores a day outside the limits and a day that isDateUnavailable marks', async () => {
    const fixture = await setup(HostDay);
    await typeText(fixture, '10/25/2026');
    await typeText(fixture, '10/15/2026');
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('marks a day that is not allowed as invalid after the blur', async () => {
    const fixture = await setup(HostDay);
    await typeText(fixture, '10/25/2026');
    input(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('accepts a range inside the limits, and rejects one with an end outside', async () => {
    const fixture = await setup(HostRange);
    await typeText(fixture, `10/12/2026 ${DASH} 10/25/2026`);
    expect(fixture.componentInstance.value()).toBeUndefined();
    await typeText(fixture, `10/12/2026 ${DASH} 10/18/2026`);
    expect(fixture.componentInstance.value()).toEqual({ start: oct(12), end: oct(18) });
  });

  it('allows an unavailable day inside a range, unless allowUnavailableInRange is false', async () => {
    const allowed = await setup(HostRange);
    await typeText(allowed, `10/12/2026 ${DASH} 10/18/2026`);
    expect(allowed.componentInstance.value()).toEqual({ start: oct(12), end: oct(18) });

    const forbidden = await setup(HostRangeStrict);
    await typeText(forbidden, `10/12/2026 ${DASH} 10/18/2026`);
    expect(forbidden.componentInstance.value()).toBeUndefined();
  });
});

describe('CalendrixDateTimePicker: a typed date and time must be ones the user could pick (ADR 0025)', () => {
  it('accepts a date and a time inside the limits', async () => {
    const fixture = await setup(HostDateTime);
    await typeText(fixture, '10/14/2026 09:30');
    expect(fixture.componentInstance.value()).toEqual(at(14, 9, 30));
  });

  it('ignores a time outside the limits and a date outside the limits', async () => {
    const fixture = await setup(HostDateTime);
    await typeText(fixture, '10/14/2026 08:30');
    await typeText(fixture, '10/14/2026 17:30');
    await typeText(fixture, '10/25/2026 09:30');
    await typeText(fixture, '10/15/2026 09:30');
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('marks a date that is not allowed as invalid after the blur', async () => {
    const fixture = await setup(HostDateTime);
    await typeText(fixture, '10/25/2026 09:30');
    input(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('checks the time of both ends of a range', async () => {
    const fixture = await setup(HostDateTimeRange);
    await typeText(fixture, `10/12/2026 09:30 ${DASH} 10/18/2026 18:00`);
    expect(fixture.componentInstance.value()).toBeUndefined();
    await typeText(fixture, `10/12/2026 09:30 ${DASH} 10/18/2026 17:00`);
    expect(fixture.componentInstance.value()).toEqual({ start: at(12, 9, 30), end: at(18, 17, 0) });
  });
});