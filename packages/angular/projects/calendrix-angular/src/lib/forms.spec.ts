import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatDateTime, type CalendarDate, type DateTimeValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixDatePicker } from './date-picker';
import { CalendrixDateTimePicker } from './date-time-picker';

const day = (value: number): CalendarDate => ({
  system: 'gregory',
  year: 2026,
  month: 10,
  day: value,
});

@Component({
  imports: [CalendrixDatePicker, ReactiveFormsModule],
  template: `<calendrix-date-picker [formControl]="control" />`,
})
class DateHost {
  control = new FormControl<CalendarDate | null>(null);
}

@Component({
  imports: [CalendrixDatePicker, FormsModule],
  template: `<calendrix-date-picker [(ngModel)]="date" />`,
})
class NgModelHost {
  date = signal<CalendarDate | null>(null);
}

@Component({
  imports: [CalendrixDateTimePicker, ReactiveFormsModule],
  template: `<calendrix-date-time-picker [hourCycle]="24" [formControl]="control" />`,
})
class DateTimeHost {
  control = new FormControl<DateTimeValue | null>(null);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function setup<T>(host: new () => T): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(host);
  await settle(fixture);
  return fixture;
}

const field = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement.querySelector('input.calendrix-input') as HTMLInputElement;

const toggle = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement.querySelector(
    'button.calendrix-toggle:not(.calendrix-clear)',
  ) as HTMLButtonElement;

function typeText(fixture: ComponentFixture<unknown>, text: string): void {
  const input = field(fixture);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('forms: CalendrixDatePicker', () => {
  it('shows the value written by the form and does not mark the control dirty', async () => {
    const fixture = await setup(DateHost);
    fixture.componentInstance.control.setValue(day(14));
    await settle(fixture);

    expect(field(fixture).value).toBe('10/14/2026');
    expect(fixture.componentInstance.control.dirty).toBe(false);
    expect(fixture.componentInstance.control.touched).toBe(false);
  });

  it('sends a typed date to the control and marks it dirty', async () => {
    const fixture = await setup(DateHost);
    typeText(fixture, '10/20/2026');
    await settle(fixture);

    expect(fixture.componentInstance.control.value).toMatchObject({ year: 2026, month: 10, day: 20 });
    expect(fixture.componentInstance.control.dirty).toBe(true);
  });

  it('marks the control touched when the input loses the focus', async () => {
    const fixture = await setup(DateHost);
    field(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('empties the input on reset', async () => {
    const fixture = await setup(DateHost);
    fixture.componentInstance.control.setValue(day(14));
    await settle(fixture);
    fixture.componentInstance.control.reset();
    await settle(fixture);
    expect(field(fixture).value).toBe('');
  });

  it('follows disable() and enable()', async () => {
    const fixture = await setup(DateHost);
    fixture.componentInstance.control.disable();
    await settle(fixture);
    expect(field(fixture).disabled).toBe(true);
    expect(toggle(fixture).disabled).toBe(true);

    fixture.componentInstance.control.enable();
    await settle(fixture);
    expect(field(fixture).disabled).toBe(false);
    expect(toggle(fixture).disabled).toBe(false);
  });

  it('works with Validators.required', async () => {
    const fixture = await setup(DateHost);
    const { control } = fixture.componentInstance;
    control.addValidators(Validators.required);
    control.updateValueAndValidity();
    expect(control.valid).toBe(false);

    typeText(fixture, '10/20/2026');
    await settle(fixture);
    expect(control.valid).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await setup(NgModelHost);
    fixture.componentInstance.date.set(day(14));
    await settle(fixture);
    expect(field(fixture).value).toBe('10/14/2026');

    typeText(fixture, '10/20/2026');
    await settle(fixture);
    expect(fixture.componentInstance.date()).toMatchObject({ day: 20 });
  });
});

describe('forms: CalendrixDateTimePicker', () => {
  it('shows the value written by the form and sends a typed value back', async () => {
    const fixture = await setup(DateTimeHost);
    const { control } = fixture.componentInstance;
    control.setValue({ date: day(14), time: { hour: 9, minute: 30, second: 0 } });
    await settle(fixture);
    expect(field(fixture).value).toContain('10/14/2026');
    expect(control.dirty).toBe(false);

    const typed = formatDateTime(
      { date: day(20), time: { hour: 14, minute: 45, second: 0 } },
      { locale: 'en-US', hourCycle: 24 },
    );
    typeText(fixture, typed);
    await settle(fixture);
    expect(control.value).toMatchObject({ date: { day: 20 }, time: { hour: 14, minute: 45 } });
    expect(control.dirty).toBe(true);
  });
});