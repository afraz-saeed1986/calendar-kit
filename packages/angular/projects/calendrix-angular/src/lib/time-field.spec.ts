import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TimeValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixTimeField } from './time-field';

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field [hourCycle]="24" [(value)]="value" />`,
})
class Host24 {
  value = signal<TimeValue | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field />`,
})
class HostEmpty {}

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field locale="fa-IR" [hourCycle]="24" [defaultValue]="time" />`,
})
class HostPersian {
  time = { hour: 9, minute: 30, second: 0 };
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

function segments(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.calendrix-segment'));
}

const texts = (fixture: ComponentFixture<unknown>) =>
  segments(fixture).map((segment) => segment.textContent?.trim());

describe('CalendrixTimeField', () => {
  it('shows empty segments for a 12-hour clock', async () => {
    const fixture = await setup(HostEmpty);
    expect(segments(fixture)).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('[data-placeholder]')).toHaveLength(3);
  });

  it('shows the value set by the parent', async () => {
    const fixture = await setup(Host24);
    fixture.componentInstance.value.set({ hour: 9, minute: 30, second: 0 });
    await settle(fixture);
    expect(texts(fixture)).toEqual(['09', '30']);
  });

  it('steps the hour with the up arrow and writes the value', async () => {
    const fixture = await setup(Host24);
    fixture.componentInstance.value.set({ hour: 9, minute: 30, second: 0 });
    await settle(fixture);

    const hour = segments(fixture)[0] as HTMLElement;
    hour.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    expect(fixture.componentInstance.value()).toEqual({ hour: 10, minute: 30, second: 0 });
  });

  it('uses the numerals of the locale and the default value', async () => {
    const fixture = await setup(HostPersian);
    expect(texts(fixture)).toEqual(['۰۹', '۳۰']);
  });
});
