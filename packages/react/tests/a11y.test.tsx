import { persianPlugin } from '@calendrix/persian';
import { cleanup, fireEvent, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { DatePicker } from '../src/date-picker';
import { DateTimePicker } from '../src/date-time-picker';

const now = () => new Date(2026, 10, 9);
const plugins = [persianPlugin];

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

function openInput(container: HTMLElement) {
  const input = container.querySelector('input') as HTMLInputElement;
  fireEvent.keyDown(input, { key: 'ArrowDown' });
}

describe('accessibility (axe)', () => {
  afterEach(cleanup);

  it('DatePicker, closed', async () => {
    render(<DatePicker now={now} />);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, open', async () => {
    const { container } = render(<DatePicker now={now} />);
    openInput(container);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, range, open', async () => {
    const { container } = render(<DatePicker selection="range" now={now} />);
    openInput(container);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DatePicker, Persian and RTL, open', async () => {
    const { container } = render(
      <DatePicker system="persian" locale="fa-IR" direction="rtl" plugins={plugins} now={now} />,
    );
    openInput(container);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DateTimePicker, open', async () => {
    const { container } = render(<DateTimePicker now={now} />);
    openInput(container);
    expect(await violations()).toEqual([]);
  }, 20_000);

  it('DateTimePicker, range, Persian and RTL, open', async () => {
    const { container } = render(
      <DateTimePicker
        selection="range"
        system="persian"
        locale="fa-IR"
        direction="rtl"
        plugins={plugins}
        now={now}
      />,
    );
    openInput(container);
    expect(await violations()).toEqual([]);
  }, 20_000);
});
