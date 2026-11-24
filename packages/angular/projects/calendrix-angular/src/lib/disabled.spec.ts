import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { CalendarDate, TimeValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixCalendar } from './calendar';
import { CalendrixTimeField } from './time-field';

const day = (value: number): CalendarDate => ({
  system: 'gregory',
  year: 2026,
  month: 10,
  day: value,
});
const now = () => new Date(2026, 9, 14);

@Component({
  imports: [CalendrixCalendar],
  template: `<calendrix-calendar [now]="now" [disabled]="off()" [(value)]="value" />`,
})
class CalendarInputHost {
  now = now;
  off = signal(true);
  value = signal<CalendarDate | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixCalendar, ReactiveFormsModule],
  template: `<calendrix-calendar [now]="now" [formControl]="control" />`,
})
class CalendarFormHost {
  now = now;
  control = new FormControl<CalendarDate | null>(null);
}

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field [hourCycle]="24" [disabled]="off()" [(value)]="value" />`,
})
class TimeInputHost {
  off = signal(true);
  value = signal<TimeValue | null | undefined>({ hour: 9, minute: 30, second: 0 });
}

@Component({
  imports: [CalendrixTimeField, ReactiveFormsModule],
  template: `<calendrix-time-field [hourCycle]="24" [formControl]="control" />`,
})
class TimeFormHost {
  control = new FormControl<TimeValue | null>(null);
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

type Fixture = ComponentFixture<unknown>;
const query = <T extends Element>(fixture: Fixture, selector: string) =>
  fixture.nativeElement.querySelector(selector) as T | null;
const queryAll = <T extends Element>(fixture: Fixture, selector: string) =>
  Array.from(fixture.nativeElement.querySelectorAll(selector)) as T[];

const calendarRoot = (fixture: Fixture) => query<HTMLElement>(fixture, '.calendrix-calendar');
const buttons = (fixture: Fixture) => queryAll<HTMLButtonElement>(fixture, 'button');
const dayCell = (fixture: Fixture, label: string) =>
  queryAll<HTMLElement>(fixture, '.calendrix-day').find((d) => d.textContent?.trim() === label);
const selectedDays = (fixture: Fixture) =>
  queryAll<HTMLElement>(fixture, '.calendrix-day[aria-selected="true"]').map((d) =>
    d.textContent?.trim(),
  );
const segments = (fixture: Fixture) => queryAll<HTMLElement>(fixture, '.calendrix-segment');
const texts = (fixture: Fixture) => segments(fixture).map((s) => s.textContent?.trim());
const loseFocus = (element: HTMLElement | null) =>
  element?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));

describe('CalendrixCalendar: disabled', () => {
  it('marks the root, disables the buttons and ignores a click on a day', async () => {
    const fixture = await setup(CalendarInputHost);
    expect(calendarRoot(fixture)?.getAttribute('aria-disabled')).toBe('true');
    expect(buttons(fixture).every((button) => button.disabled)).toBe(true);
    expect(query(fixture, '[role="grid"] [tabindex="0"]')).toBeNull();

    dayCell(fixture, '20')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('follows the input when it changes', async () => {
    const fixture = await setup(CalendarInputHost);
    fixture.componentInstance.off.set(false);
    await settle(fixture);
    expect(calendarRoot(fixture)?.hasAttribute('aria-disabled')).toBe(false);

    dayCell(fixture, '20')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toMatchObject({ day: 20 });
  });
});

describe('forms: CalendrixCalendar', () => {
  it('shows the value written by the form and does not mark the control dirty', async () => {
    const fixture = await setup(CalendarFormHost);
    fixture.componentInstance.control.setValue(day(14));
    await settle(fixture);
    expect(selectedDays(fixture)).toEqual(['14']);
    expect(fixture.componentInstance.control.dirty).toBe(false);
  });

  it('sends a picked day to the control and marks it dirty', async () => {
    const fixture = await setup(CalendarFormHost);
    dayCell(fixture, '20')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toMatchObject({
      year: 2026,
      month: 10,
      day: 20,
    });
    expect(fixture.componentInstance.control.dirty).toBe(true);
  });

  it('empties the selection on reset', async () => {
    const fixture = await setup(CalendarFormHost);
    fixture.componentInstance.control.setValue(day(14));
    await settle(fixture);
    fixture.componentInstance.control.reset();
    await settle(fixture);
    expect(selectedDays(fixture)).toEqual([]);
  });

  it('follows disable() and enable()', async () => {
    const fixture = await setup(CalendarFormHost);
    fixture.componentInstance.control.disable();
    await settle(fixture);
    expect(calendarRoot(fixture)?.getAttribute('aria-disabled')).toBe('true');
    expect(buttons(fixture).every((button) => button.disabled)).toBe(true);

    fixture.componentInstance.control.enable();
    await settle(fixture);
    expect(calendarRoot(fixture)?.hasAttribute('aria-disabled')).toBe(false);
    expect(buttons(fixture).some((button) => button.disabled)).toBe(false);
  });

  it('marks the control touched when the focus leaves the calendar', async () => {
    const fixture = await setup(CalendarFormHost);
    loseFocus(calendarRoot(fixture));
    await settle(fixture);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});

describe('CalendrixTimeField: disabled', () => {
  it('marks the field, takes the segments out of the tab order and ignores keys', async () => {
    const fixture = await setup(TimeInputHost);
    expect(
      query<HTMLElement>(fixture, '.calendrix-time-field')?.getAttribute('aria-disabled'),
    ).toBe('true');
    for (const segment of segments(fixture)) {
      expect(segment.getAttribute('tabindex')).toBe('-1');
      expect(segment.getAttribute('aria-disabled')).toBe('true');
    }

    segments(fixture)[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(texts(fixture)).toEqual(['09', '30']);
    expect(fixture.componentInstance.value()).toEqual({ hour: 9, minute: 30, second: 0 });
  });
});

describe('forms: CalendrixTimeField', () => {
  it('shows the value written by the form and sends a change back', async () => {
    const fixture = await setup(TimeFormHost);
    const { control } = fixture.componentInstance;
    control.setValue({ hour: 9, minute: 30, second: 0 });
    await settle(fixture);
    expect(texts(fixture)).toEqual(['09', '30']);
    expect(control.dirty).toBe(false);

    segments(fixture)[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(control.value).toMatchObject({ hour: 10, minute: 30 });
    expect(control.dirty).toBe(true);
  });

  it('empties the segments on reset', async () => {
    const fixture = await setup(TimeFormHost);
    fixture.componentInstance.control.setValue({ hour: 9, minute: 30, second: 0 });
    await settle(fixture);
    fixture.componentInstance.control.reset();
    await settle(fixture);
    expect(texts(fixture)).toEqual(['--', '--']);
  });

  it('follows disable() and enable()', async () => {
    const fixture = await setup(TimeFormHost);
    fixture.componentInstance.control.disable();
    await settle(fixture);
    expect(segments(fixture).every((s) => s.getAttribute('tabindex') === '-1')).toBe(true);

    fixture.componentInstance.control.enable();
    await settle(fixture);
    expect(segments(fixture).every((s) => s.getAttribute('tabindex') === '0')).toBe(true);
  });

  it('marks the control touched when the focus leaves the field', async () => {
    const fixture = await setup(TimeFormHost);
    loseFocus(query<HTMLElement>(fixture, '.calendrix-time-field'));
    await settle(fixture);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});
