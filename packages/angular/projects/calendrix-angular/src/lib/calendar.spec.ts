import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarDate, DateRange } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { describe, expect, it } from 'vitest';
import { CalendrixCalendar } from './calendar';

const now = () => new Date(2026, 10, 9);
const nov = (day: number) => ({ system: 'gregory', year: 2026, month: 11, day });

@Component({
  imports: [CalendrixCalendar],
  template: `<calendrix-calendar selection="single" [now]="now" [(value)]="value" />`,
})
class SingleHost {
  now = now;
  value = signal<CalendarDate | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixCalendar],
  template: `<calendrix-calendar selection="range" [now]="now" [(value)]="value" />`,
})
class RangeHost {
  now = now;
  value = signal<DateRange | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixCalendar],
  template: `<calendrix-calendar
    selection="single"
    system="persian"
    locale="fa-IR"
    [plugins]="plugins"
    [now]="now"
  />`,
})
class PersianHost {
  now = now;
  plugins = [persianPlugin];
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

function days(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.calendrix-day'));
}

function day(fixture: ComponentFixture<unknown>, label: string): HTMLElement {
  const found = days(fixture).find((element) => element.textContent?.trim() === label);
  if (!found) throw new Error(`No day ${label}`);
  return found;
}

describe('CalendrixCalendar', () => {
  it('shows November 2026 with six weeks of days', async () => {
    const fixture = await setup(SingleHost);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.calendrix-month-button')?.textContent?.trim()).toBe('November');
    expect(root.querySelector('.calendrix-year-button')?.textContent?.trim()).toBe('2026');
    expect(days(fixture)).toHaveLength(42);
  });

  it('writes the picked day to the value', async () => {
    const fixture = await setup(SingleHost);
    day(fixture, '15').click();
    expect(fixture.componentInstance.value()).toEqual(nov(15));
    await settle(fixture);
    expect(day(fixture, '15').getAttribute('aria-selected')).toBe('true');
  });

  it('shows a value set by the parent', async () => {
    const fixture = await setup(SingleHost);
    fixture.componentInstance.value.set(nov(20));
    await settle(fixture);
    expect(day(fixture, '20').getAttribute('aria-selected')).toBe('true');
  });

  it('completes a range with the second click only', async () => {
    const fixture = await setup(RangeHost);
    day(fixture, '18').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
    day(fixture, '25').click();
    expect(fixture.componentInstance.value()).toEqual({ start: nov(18), end: nov(25) });
  });

  it('moves the focus with the arrow keys', async () => {
    const fixture = await setup(SingleHost);
    const root: HTMLElement = fixture.nativeElement;
    const focused = root.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]');
    expect(focused?.textContent?.trim()).toBe('9');

    focused?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    await settle(fixture);

    const next = root.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]');
    expect(next?.textContent?.trim()).toBe('10');
    expect(document.activeElement).toBe(next);
  });

  it('shows the Persian calendar', async () => {
    const fixture = await setup(PersianHost);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.calendrix-month-button')?.textContent?.trim()).toBe('آبان');
    expect(root.querySelector('.calendrix-year-button')?.textContent?.trim()).toBe('۱۴۰۵');
  });
});