import { Component, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CalendrixDatePicker } from './date-picker';

const now = () => new Date('2026-10-14T10:00:00Z');

@Component({
  imports: [CalendrixDatePicker],
  template: `<div data-theme="dark"><calendrix-date-picker locale="en-US" [now]="now" /></div>`,
})
class HostDark {
  now = now;
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<div data-theme="dark"
    ><section data-theme="light"><calendrix-date-picker locale="en-US" [now]="now" /></section
  ></div>`,
})
class HostNested {
  now = now;
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker locale="en-US" [now]="now" />`,
})
class HostNone {
  now = now;
}

@Component({
  imports: [CalendrixDatePicker],
  template: `<div data-theme="dark"
    ><calendrix-date-picker locale="en-US" [now]="now" [portal]="false"
  /></div>`,
})
class HostNoPortal {
  now = now;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function open<T>(host: Type<T>): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(host);
  await settle(fixture);
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLElement>('.calendrix-toggle:not(.calendrix-clear)')!
    .click();
  await settle(fixture);
  return fixture;
}

const popover = () => document.body.querySelector<HTMLElement>('.calendrix-popover');

describe('the theme of an ancestor and a portaled popover (ADR 0026)', () => {
  it('copies the data-theme of an ancestor', async () => {
    await open(HostDark);
    expect(popover()?.getAttribute('data-theme')).toBe('dark');
  });

  it('copies the nearest one', async () => {
    await open(HostNested);
    expect(popover()?.getAttribute('data-theme')).toBe('light');
  });

  it('sets nothing when no ancestor has a data-theme', async () => {
    await open(HostNone);
    expect(popover()).not.toBeNull();
    expect(popover()?.hasAttribute('data-theme')).toBe(false);
  });

  it('sets nothing when the popover is not portaled', async () => {
    const fixture = await open(HostNoPortal);
    const inside = (fixture.nativeElement as HTMLElement).querySelector('.calendrix-popover');
    expect(inside?.hasAttribute('data-theme')).toBe(false);
  });
});