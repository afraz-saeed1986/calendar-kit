import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CalendrixPopover, type PopoverDismissReason } from './popover';

@Component({
  imports: [CalendrixPopover],
  template: `
    <div #anchor class="anchor"><input class="field" /></div>
    <button class="elsewhere">elsewhere</button>
    @if (open()) {
      <div [calendrixPopover]="anchor" [portal]="portal()" (dismiss)="reasons.push($event)">
        <button class="first">first</button>
        <button class="last">last</button>
      </div>
    }
  `,
})
class Host {
  readonly open = signal(true);
  readonly portal = signal(true);
  readonly reasons: PopoverDismissReason[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function setup(portal = true): Promise<ComponentFixture<Host>> {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.portal.set(portal);
  await settle(fixture);
  return fixture;
}

const popoverIn = (root: ParentNode) => root.querySelector<HTMLElement>('.calendrix-popover');

function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('CalendrixPopover', () => {
  it('moves into <body> by default and is placed with fixed positioning', async () => {
    const fixture = await setup();
    const popover = popoverIn(document.body) as HTMLElement;
    expect(popover.parentElement).toBe(document.body);
    expect(fixture.nativeElement.contains(popover)).toBe(false);
    expect(popover.style.position).toBe('fixed');
  });

  it('stays in place with portal turned off', async () => {
    const fixture = await setup(false);
    const popover = popoverIn(fixture.nativeElement) as HTMLElement;
    expect(popover).not.toBeNull();
    expect(popover.parentElement).not.toBe(document.body);
  });

  it('removes the element from <body> when it closes', async () => {
    const fixture = await setup();
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    expect(popoverIn(document.body)).toBeNull();
  });

  it('moves the focus into the popover when it opens', async () => {
    await setup();
    expect(document.activeElement).toBe(popoverIn(document.body));
  });

  it('asks to close for a press outside, not inside the popover or the anchor', async () => {
    const fixture = await setup();
    const { reasons } = fixture.componentInstance;
    const fire = (target: Element) =>
      target.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    fire(popoverIn(document.body)?.querySelector('.first') as Element);
    fire(fixture.nativeElement.querySelector('.field'));
    expect(reasons).toEqual([]);

    fire(fixture.nativeElement.querySelector('.elsewhere'));
    expect(reasons).toEqual(['outside']);
  });

  it('asks to close on Escape, wherever the focus is', async () => {
    const fixture = await setup();
    press(popoverIn(document.body)?.querySelector('.first') as Element, 'Escape');
    press(document.body, 'Escape');
    expect(fixture.componentInstance.reasons).toEqual(['escape', 'escape']);
  });

  it('leaves an Escape that something inside already used', async () => {
    const fixture = await setup();
    const first = popoverIn(document.body)?.querySelector('.first') as HTMLElement;
    first.addEventListener('keydown', (event) => event.preventDefault());
    press(first, 'Escape');
    expect(fixture.componentInstance.reasons).toEqual([]);
  });

  it('keeps Tab inside the popover', async () => {
    await setup();
    const popover = popoverIn(document.body) as HTMLElement;
    const first = popover.querySelector<HTMLElement>('.first') as HTMLElement;
    const last = popover.querySelector<HTMLElement>('.last') as HTMLElement;

    last.focus();
    expect(press(last, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    expect(press(first, 'Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });
});
