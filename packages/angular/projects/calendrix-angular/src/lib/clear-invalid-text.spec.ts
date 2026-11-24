import { Component, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDate } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixDatePicker } from './date-picker';
import { CalendrixDateTimePicker } from './date-time-picker';

const now = () => new Date('2026-10-14T10:00:00Z');
const oct = (day: number): CalendarDate => ({ system: 'gregory', year: 2026, month: 10, day });

class Limits {
  now = now;
  min = oct(10);
  max = oct(20);
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker
    locale="en-US"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
  />`,
})
class HostDay extends Limits {}

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker
    locale="en-US"
    [hourCycle]="24"
    [now]="now"
    [portal]="false"
    [minDate]="min"
    [maxDate]="max"
  />`,
})
class HostDateTime extends Limits {}

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
const clearButton = (fixture: ComponentFixture<unknown>) =>
  root(fixture).querySelector<HTMLElement>('.calendrix-clear');

async function typeText(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const element = input(fixture);
  element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

describe('the clear button and a text that is not a value (ADR 0025)', () => {
  it('is not there while the input is empty', async () => {
    const fixture = await setup(HostDay);
    expect(clearButton(fixture)).toBeNull();
  });

  it('CalendrixDatePicker: clears a text that is not allowed, and gives the focus to the input', async () => {
    const fixture = await setup(HostDay);
    await typeText(fixture, '10/25/2026');
    expect(clearButton(fixture)).not.toBeNull();
    clearButton(fixture)!.click();
    await settle(fixture);
    expect(input(fixture).value).toBe('');
    expect(clearButton(fixture)).toBeNull();
    expect(document.activeElement).toBe(input(fixture));
  });

  it('CalendrixDateTimePicker: clears a text that is not allowed', async () => {
    const fixture = await setup(HostDateTime);
    await typeText(fixture, '10/25/2026 09:30');
    clearButton(fixture)!.click();
    await settle(fixture);
    expect(input(fixture).value).toBe('');
    expect(document.activeElement).toBe(input(fixture));
  });
});
