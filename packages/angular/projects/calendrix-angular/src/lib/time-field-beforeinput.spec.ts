import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TimeValue } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { CalendrixTimeField } from './time-field';

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field locale="en-US" [hourCycle]="24" [(value)]="value" />`,
})
class Host {
  value = signal<TimeValue | null | undefined>(undefined);
}

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field
    locale="en-US"
    [hourCycle]="24"
    [defaultValue]="time"
  />`,
})
class HostDefault {
  time = { hour: 9, minute: 30, second: 0 };
}

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field locale="en-US" [hourCycle]="24" [disabled]="true" />`,
})
class HostDisabled {}

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

const segment = (fixture: ComponentFixture<unknown>, type: string) =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-segment="${type}"]`)!;
const text = (fixture: ComponentFixture<unknown>, type: string) =>
  segment(fixture, type).textContent?.trim();

/** Returns false when the handler called `preventDefault()`. */
async function type(
  fixture: ComponentFixture<unknown>,
  segmentType: string,
  data: string,
  inputType = 'insertText',
): Promise<boolean> {
  const notPrevented = segment(fixture, segmentType).dispatchEvent(
    new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }),
  );
  await settle(fixture);
  return notPrevented;
}

describe('CalendrixTimeField: on-screen keyboard (ADR 0024)', () => {
  it('makes the segments editable, with a numeric keyboard', async () => {
    const fixture = await setup(Host);
    const hour = segment(fixture, 'hour');
    expect(hour.getAttribute('contenteditable')).toBe('true');
    expect(hour.getAttribute('inputmode')).toBe('numeric');
    expect(hour.getAttribute('enterkeyhint')).toBe('next');
    expect(hour.getAttribute('spellcheck')).toBe('false');
  });

  it('types a digit, stops the browser from writing, and moves the focus on', async () => {
    const fixture = await setup(Host);
    expect(await type(fixture, 'hour', '1')).toBe(false);
    await type(fixture, 'hour', '4');
    expect(text(fixture, 'hour')).toBe('14');
    expect(document.activeElement).toBe(segment(fixture, 'minute'));
  });

  it('fills the next segments with a pasted text and reports the value', async () => {
    const fixture = await setup(Host);
    await type(fixture, 'hour', '1430', 'insertFromPaste');
    expect(text(fixture, 'hour')).toBe('14');
    expect(text(fixture, 'minute')).toBe('30');
    expect(fixture.componentInstance.value()).toMatchObject({ hour: 14, minute: 30 });
  });

  it('clears on a deletion', async () => {
    const fixture = await setup(HostDefault);
    await type(fixture, 'hour', '', 'deleteContentBackward');
    expect(text(fixture, 'hour')).toBe('--');
  });

  it('writes the text of the state back after a composition', async () => {
    const fixture = await setup(Host);
    const hour = segment(fixture, 'hour');
    (hour.firstChild as Text).data = '77';
    hour.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }));
    await settle(fixture);
    expect(hour.textContent?.trim()).toBe('--');
  });

  it('is not editable when disabled', async () => {
    const fixture = await setup(HostDisabled);
    expect(segment(fixture, 'hour').hasAttribute('contenteditable')).toBe(false);
  });
});