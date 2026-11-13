import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { formatDateTime, type CalendarDate, type DateTimeValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixDateTimePicker } from './date-time-picker';

const day = (value: number): CalendarDate => ({
  system: 'gregory',
  year: 2026,
  month: 10,
  day: value,
});

const morning: DateTimeValue = { date: day(14), time: { hour: 9, minute: 30, second: 0 } };

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker [hourCycle]="24" [(value)]="value" />`,
})
class Host {
  value = signal<DateTimeValue | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker [hourCycle]="24" [defaultValue]="value" />`,
})
class HostDefault {
  value = morning;
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

const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');

function typeText(fixture: ComponentFixture<unknown>, text: string): void {
  const input = field(fixture);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('CalendrixDateTimePicker', () => {
  it('shows the default value as text', async () => {
    const fixture = await setup(HostDefault);
    expect(field(fixture).value).toContain('10/14/2026');
    expect(field(fixture).value).toMatch(/9:30/);
  });

  it('writes the value for a typed date and time and keeps the text as typed', async () => {
    const fixture = await setup(Host);
    const typed = formatDateTime(
      { date: day(20), time: { hour: 14, minute: 45, second: 0 } },
      { locale: 'en-US', hourCycle: 24 },
    );
    typeText(fixture, typed);
    await settle(fixture);

    expect(fixture.componentInstance.value()).toMatchObject({
      date: { year: 2026, month: 10, day: 20 },
      time: { hour: 14, minute: 45 },
    });
    expect(field(fixture).value).toBe(typed);
  });

  it('marks a text that is not a date as invalid after the input loses the focus', async () => {
    const fixture = await setup(Host);
    typeText(fixture, 'abc');
    await settle(fixture);
    expect(field(fixture).getAttribute('aria-invalid')).toBeNull();

    field(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(field(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('opens a dialog with a calendar and a time field, and Escape closes it and returns the focus', async () => {
    const fixture = await setup(Host);
    toggle(fixture).click();
    await settle(fixture);

    expect(dialog()?.getAttribute('aria-label')).toBe('Choose date and time');
    expect(dialog()?.querySelector('.calendrix-time-field')).not.toBeNull();

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(field(fixture));
  });

  it('changes the time of the picked date with the time field and clears with the button', async () => {
    const fixture = await setup(Host);
    fixture.componentInstance.value.set(morning);
    await settle(fixture);

    toggle(fixture).click();
    await settle(fixture);

    const hour = dialog()?.querySelector('.calendrix-segment') as HTMLElement;
    hour.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toMatchObject({
      date: { day: 14 },
      time: { hour: 10, minute: 30 },
    });

    (dialog()?.querySelector('.calendrix-action') as HTMLElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(field(fixture).value).toBe('');
  });

  it('clears with the button in the field and gives the focus to the input', async () => {
    const fixture = await setup(Host);
    expect(fixture.nativeElement.querySelector('.calendrix-clear')).toBeNull();

    fixture.componentInstance.value.set(morning);
    await settle(fixture);
    fixture.nativeElement.querySelector('.calendrix-clear').click();
    await settle(fixture);

    expect(fixture.componentInstance.value()).toBeNull();
    expect(field(fixture).value).toBe('');
    expect(fixture.nativeElement.querySelector('.calendrix-clear')).toBeNull();
    expect(document.activeElement).toBe(field(fixture));
  });
});
