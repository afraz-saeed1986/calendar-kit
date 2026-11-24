import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CalendrixTimeField } from './time-field';

@Component({
  imports: [CalendrixTimeField],
  template: `<calendrix-time-field locale="en-US" [showSeconds]="showSeconds()" />`,
})
class Host {
  readonly showSeconds = signal<boolean | undefined>(true);
}

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const segments = (fixture: ComponentFixture<unknown>) =>
  Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-segment]')).map(
    (element) => element.getAttribute('data-segment'),
  );

describe('time field options that go back to undefined', () => {
  it('clears showSeconds', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(segments(fixture)).toEqual(['hour', 'minute', 'second', 'period']);

    fixture.componentInstance.showSeconds.set(undefined);
    await settle(fixture);
    expect(segments(fixture)).toEqual(['hour', 'minute', 'period']);
  });
});
