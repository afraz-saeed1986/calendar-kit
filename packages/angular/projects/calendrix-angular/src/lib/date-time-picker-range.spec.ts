import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { createDate, type DateTimeRange } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixDateTimePicker } from './date-time-picker';

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const DASH = '\u2013';

const at = (day: number, hour: number, minute = 0) => ({
  date: createDate('gregory', 2026, 10, day),
  time: { hour, minute, second: 0 },
});
const week: DateTimeRange = { start: at(14, 9, 30), end: at(21, 17, 0) };
const sameDay: DateTimeRange = { start: at(14, 9, 30), end: at(14, 17, 0) };

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker
    [selection]="'range'"
    locale="en-US"
    [hourCycle]="24"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [(value)]="value"
  />`,
})
class HostRange {
  now = now;
  value = signal<DateTimeRange | null | undefined>(undefined);
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
    [(value)]="value"
  />`,
})
class HostRangeWeek {
  now = now;
  value = signal<DateTimeRange | null | undefined>(week);
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
    [(value)]="value"
  />`,
})
class HostRangeSameDay {
  now = now;
  value = signal<DateTimeRange | null | undefined>(sameDay);
}

@Component({
  imports: [CalendrixDateTimePicker, ReactiveFormsModule],
  template: `<calendrix-date-time-picker
    [selection]="'range'"
    locale="en-US"
    [hourCycle]="24"
    timeZone="UTC"
    [now]="now"
    [portal]="false"
    [formControl]="control"
  />`,
})
class HostForm {
  now = now;
  control = new FormControl<DateTimeRange | null>(null);
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

const root = (fixture: ComponentFixture<unknown>) => fixture.nativeElement as HTMLElement;
const input = (fixture: ComponentFixture<unknown>) =>
  root(fixture).querySelector<HTMLInputElement>('input.calendrix-input')!;

async function open(fixture: ComponentFixture<unknown>): Promise<void> {
  root(fixture).querySelector<HTMLElement>('.calendrix-toggle:not(.calendrix-clear)')!.click();
  await settle(fixture);
}

async function typeText(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const element = input(fixture);
  element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

async function clickDay(fixture: ComponentFixture<unknown>, label: string): Promise<void> {
  root(fixture).querySelector<HTMLElement>(`.calendrix-day[aria-label*="${label}"]`)!.click();
  await settle(fixture);
}

const hourSegment = (fixture: ComponentFixture<unknown>, group: string) =>
  root(fixture).querySelector<HTMLElement>(
    `[role="group"][aria-label="${group}"] [data-segment="hour"]`,
  )!;

async function press(
  fixture: ComponentFixture<unknown>,
  element: HTMLElement,
  keys: string[],
): Promise<void> {
  for (const key of keys) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await settle(fixture);
  }
}

describe('CalendrixDateTimePicker selection="range": input', () => {
  it('shows the format of a range as the placeholder', async () => {
    const fixture = await setup(HostRange);
    expect(input(fixture).placeholder).toBe(`10/14/2026 09:30 ${DASH} 10/21/2026 17:00`);
  });

  it('shows a range in the format of the locale', async () => {
    const fixture = await setup(HostRangeWeek);
    expect(input(fixture).value).toBe(`10/14/2026 09:30 ${DASH} 10/21/2026 17:00`);
  });

  it('reads a typed range', async () => {
    const fixture = await setup(HostRange);
    await typeText(fixture, `10/20/2026 14:05 ${DASH} 10/22/2026 16:00`);
    expect(fixture.componentInstance.value()).toEqual({ start: at(20, 14, 5), end: at(22, 16, 0) });
  });

  it('does not report a text with one end, and marks it invalid after the blur', async () => {
    const fixture = await setup(HostRange);
    await typeText(fixture, '10/20/2026 14:05');
    expect(fixture.componentInstance.value()).toBeUndefined();
    input(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('reports null when the text is emptied', async () => {
    const fixture = await setup(HostRangeWeek);
    await typeText(fixture, '');
    expect(fixture.componentInstance.value()).toBeNull();
  });
});

describe('CalendrixDateTimePicker selection="range": popover', () => {
  it('shows two months and a time field for each end', async () => {
    const fixture = await setup(HostRange);
    await open(fixture);
    expect(root(fixture).querySelectorAll('.calendrix-panel')).toHaveLength(2);
    expect(root(fixture).querySelector('[role="group"][aria-label="Start time"]')).not.toBeNull();
    expect(root(fixture).querySelector('[role="group"][aria-label="End time"]')).not.toBeNull();
  });

  it('reports the range with the default times once the second day is picked', async () => {
    const fixture = await setup(HostRange);
    await open(fixture);
    await clickDay(fixture, 'October 20, 2026');
    expect(fixture.componentInstance.value()).toBeUndefined();
    await clickDay(fixture, 'October 22, 2026');
    expect(fixture.componentInstance.value()).toEqual({ start: at(20, 0), end: at(22, 0) });
    expect(root(fixture).querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps the times chosen before the days', async () => {
    const fixture = await setup(HostRange);
    await open(fixture);
    await press(fixture, hourSegment(fixture, 'Start time'), ['1', '4']);
    await press(fixture, hourSegment(fixture, 'End time'), ['1', '8']);
    await clickDay(fixture, 'October 20, 2026');
    await clickDay(fixture, 'October 22, 2026');
    expect(fixture.componentInstance.value()).toEqual({ start: at(20, 14), end: at(22, 18) });
  });

  it('changes a time of a complete range', async () => {
    const fixture = await setup(HostRangeWeek);
    await open(fixture);
    await press(fixture, hourSegment(fixture, 'End time'), ['ArrowUp']);
    expect(fixture.componentInstance.value()).toEqual({ start: at(14, 9, 30), end: at(21, 18, 0) });
  });

  it('sticks the end to the start when the end time is set earlier on the same day', async () => {
    const fixture = await setup(HostRangeSameDay);
    await open(fixture);
    await press(fixture, hourSegment(fixture, 'End time'), ['0', '8']);
    expect(fixture.componentInstance.value()).toEqual({ start: at(14, 9, 30), end: at(14, 9, 30) });
  });

  it('sticks the end to the start when the start time is set later than the end', async () => {
    const fixture = await setup(HostRangeSameDay);
    await open(fixture);
    await press(fixture, hourSegment(fixture, 'Start time'), ['1', '9']);
    const value = fixture.componentInstance.value()!;
    expect(value.start).toEqual(value.end);
    expect(value.start.time.hour).toBe(19);
  });
});

describe('CalendrixDateTimePicker selection="range": forms', () => {
  it('writes a range from the control into the input', async () => {
    const fixture = await setup(HostForm);
    fixture.componentInstance.control.setValue(week);
    await settle(fixture);
    expect(input(fixture).value).toBe(`10/14/2026 09:30 ${DASH} 10/21/2026 17:00`);
  });

  it('sends a typed range to the control, and null after a reset', async () => {
    const fixture = await setup(HostForm);
    await typeText(fixture, `10/20/2026 14:05 ${DASH} 10/22/2026 16:00`);
    expect(fixture.componentInstance.control.value).toEqual({
      start: at(20, 14, 5),
      end: at(22, 16, 0),
    });
    fixture.componentInstance.control.reset();
    await settle(fixture);
    expect(input(fixture).value).toBe('');
  });
});
