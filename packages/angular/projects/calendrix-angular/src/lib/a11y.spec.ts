import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { persianPlugin } from '@calendrix/persian';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { CalendrixDatePicker } from './date-picker';
import { CalendrixDateTimePicker } from './date-time-picker';

const plugins = [persianPlugin];

@Component({ imports: [CalendrixDatePicker], template: `<calendrix-date-picker />` })
class HostDate {}

@Component({
  imports: [CalendrixDatePicker],
  template: `<calendrix-date-picker
    system="persian"
    locale="fa-IR"
    direction="rtl"
    [plugins]="plugins"
  />`,
})
class HostDatePersian {
  plugins = plugins;
}

@Component({ imports: [CalendrixDateTimePicker], template: `<calendrix-date-time-picker />` })
class HostDateTime {}

@Component({
  imports: [CalendrixDateTimePicker],
  template: `<calendrix-date-time-picker
    [selection]="'range'"
    system="persian"
    locale="fa-IR"
    direction="rtl"
    [plugins]="plugins"
  />`,
})
class HostDateTimeRangePersian {
  plugins = plugins;
}

/** WCAG 2.x A and AA. Colour contrast needs real layout, so jsdom cannot judge it: that part is manual. */
async function violations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
}

async function render(host: Type<unknown>, open: boolean) {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  await fixture.whenStable();
  if (open) {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }
  return fixture;
}

describe('accessibility (axe)', () => {
  it('DatePicker, closed', async () => {
    await render(HostDate, false);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, open', async () => {
    await render(HostDate, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, Persian and RTL, open', async () => {
    await render(HostDatePersian, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DateTimePicker, open', async () => {
    await render(HostDateTime, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DateTimePicker, range, Persian and RTL, open', async () => {
    await render(HostDateTimeRangePersian, true);
    expect(await violations()).toEqual([]);
  }, 20_000);
});
