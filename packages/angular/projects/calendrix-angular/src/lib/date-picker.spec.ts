import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDate, SelectionValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixDatePicker } from './date-picker';

const day = (value: number): CalendarDate => ({
  system: 'gregory',
  year: 2026,
  month: 10,
  day: value,
});

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker [(value)]="value" />`,
})
class HostSingle {
  value = signal<SelectionValue<'single'> | undefined>(undefined);
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker [defaultValue]="date" />`,
})
class HostDefault {
  date = day(14);
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker [selection]="'range'" [(value)]="value" />`,
})
class HostRange {
  value = signal<SelectionValue<'range'> | undefined>(undefined);
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker [selection]="'multiple'" [defaultValue]="days" />`,
})
class HostMany {
  days = [day(1), day(2), day(3), day(4)];
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

describe('CalendrixDatePicker', () => {
  it('shows the default value as text', async () => {
    const fixture = await setup(HostDefault);
    expect(field(fixture).value).toBe('10/14/2026');
  });

  it('writes the value for a typed date and keeps the text as typed', async () => {
    const fixture = await setup(HostSingle);
    typeText(fixture, '10/05/2026');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toMatchObject({ year: 2026, month: 10, day: 5 });
    expect(field(fixture).value).toBe('10/05/2026');
  });

  it('marks a text that is not a date as invalid after the input loses the focus', async () => {
    const fixture = await setup(HostSingle);
    typeText(fixture, 'abc');
    await settle(fixture);
    expect(field(fixture).getAttribute('aria-invalid')).toBeNull();

    field(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(field(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('clears with the button in the field', async () => {
    const fixture = await setup(HostSingle);
    fixture.componentInstance.value.set(day(14));
    await settle(fixture);
    expect(field(fixture).value).toBe('10/14/2026');

    fixture.nativeElement.querySelector('.calendrix-clear').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(field(fixture).value).toBe('');
    expect(fixture.nativeElement.querySelector('.calendrix-clear')).toBeNull();
  });

  it('reads a typed range', async () => {
    const fixture = await setup(HostRange);
    typeText(fixture, '10/14/2026 \u2013 10/21/2026');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toMatchObject({
      start: { year: 2026, month: 10, day: 14 },
      end: { year: 2026, month: 10, day: 21 },
    });
  });

  it('shows a count for a long list of days and does not allow typing', async () => {
    const fixture = await setup(HostMany);
    expect(field(fixture).value).toBe('4 dates');
    expect(field(fixture).readOnly).toBe(true);
  });

  it('opens a dialog without time in its name, and Escape closes it and returns the focus', async () => {
    const fixture = await setup(HostSingle);
    toggle(fixture).click();
    await settle(fixture);

    expect(dialog()).not.toBeNull();
    expect(dialog()?.getAttribute('aria-label')).toBe('Choose date');
    expect(toggle(fixture).getAttribute('aria-expanded')).toBe('true');

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(field(fixture));
  });

  it('opens with the down arrow and closes with a press outside', async () => {
    const fixture = await setup(HostSingle);
    field(fixture).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(dialog()).not.toBeNull();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(dialog()).toBeNull();
  });
});
