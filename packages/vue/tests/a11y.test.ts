import { persianPlugin } from '@calendrix/persian';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick, type Component } from 'vue';
import DatePicker from '../src/DatePicker.vue';
import DateTimePicker from '../src/DateTimePicker.vue';

const now = () => new Date(2026, 10, 9);
const plugins = [persianPlugin];
const persian = { system: 'persian', locale: 'fa-IR', direction: 'rtl', plugins };

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

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

async function render(component: Component, props: Record<string, unknown>, open: boolean) {
  const wrapper = mount(component, { props: { now, portal: false, ...props }, attachTo: document.body });
  mounted.push(wrapper);
  if (open) {
    await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
  }
}

describe('accessibility (axe)', () => {
  it('DatePicker, closed', async () => {
    await render(DatePicker, {}, false);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, open', async () => {
    await render(DatePicker, {}, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, range, open', async () => {
    await render(DatePicker, { selection: 'range' }, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, Persian and RTL, open', async () => {
    await render(DatePicker, persian, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DateTimePicker, open', async () => {
    await render(DateTimePicker, {}, true);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DateTimePicker, range, Persian and RTL, open', async () => {
    await render(DateTimePicker, { selection: 'range', ...persian }, true);
    expect(await violations()).toEqual([]);
  }, 20_000);
});