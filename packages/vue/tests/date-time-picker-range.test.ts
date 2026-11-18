import { createDate, type DateTimeRange } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import DateTimePicker from '../src/DateTimePicker.vue';

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const DASH = '\u2013';

const at = (day: number, hour: number, minute = 0) => ({
  date: createDate('gregory', 2026, 10, day),
  time: { hour, minute, second: 0 },
});
const week: DateTimeRange = { start: at(14, 9, 30), end: at(21, 17, 0) };
const sameDay: DateTimeRange = { start: at(14, 9, 30), end: at(14, 17, 0) };

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(DateTimePicker, {
    props: { selection: 'range', locale: 'en-US', hourCycle: 24, timeZone: 'UTC', now, portal: false, ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

type Wrapper = ReturnType<typeof render>;
const input = (w: Wrapper) => w.get<HTMLInputElement>('input');
const open = (w: Wrapper) => w.get('.calendrix-toggle:not(.calendrix-clear)').trigger('click');
const day = (w: Wrapper, label: string) => w.get(`.calendrix-day[aria-label*="${label}"]`);
const hourOf = (w: Wrapper, group: string) =>
  w.get(`[role="group"][aria-label="${group}"] [data-segment="hour"]`);
const lastEmitted = (w: Wrapper) => w.emitted('update:modelValue')?.at(-1)?.[0];
async function type(element: ReturnType<typeof hourOf>, keys: string) {
  for (const key of keys) await element.trigger('keydown', { key });
}

describe('DateTimePicker selection="range": input', () => {
  it('shows the format of a range as the placeholder', () => {
    expect(input(render()).attributes('placeholder')).toBe(
      `10/14/2026 09:30 ${DASH} 10/21/2026 17:00`,
    );
  });

  it('shows a range in the format of the locale', () => {
    expect(input(render({ defaultValue: week })).element.value).toBe(
      `10/14/2026 09:30 ${DASH} 10/21/2026 17:00`,
    );
  });

  it('shows a range with the numerals of the locale and the calendar system', () => {
    const wrapper = render({
      system: 'persian',
      locale: 'fa-IR',
      plugins: [persianPlugin],
      defaultValue: week,
    });
    expect(input(wrapper).element.value).toMatch(/[\u06F0-\u06F9]/);
    expect(input(wrapper).element.value).toContain(DASH);
  });

  it('reads a typed range', async () => {
    const wrapper = render();
    await input(wrapper).setValue(`10/20/2026 14:05 ${DASH} 10/22/2026 16:00`);
    expect(lastEmitted(wrapper)).toEqual({ start: at(20, 14, 5), end: at(22, 16, 0) });
  });

  it('does not report a text with one end, and marks it invalid after the blur', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/20/2026 14:05');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await input(wrapper).trigger('blur');
    await nextTick();
    expect(input(wrapper).attributes('aria-invalid')).toBe('true');
  });

  it('reports null when the text is emptied', async () => {
    const wrapper = render({ defaultValue: week });
    await input(wrapper).setValue('');
    expect(lastEmitted(wrapper)).toBeNull();
  });
});

describe('DateTimePicker selection="range": popover', () => {
  it('shows two months and a time field for each end', async () => {
    const wrapper = render();
    await open(wrapper);
    expect(wrapper.findAll('.calendrix-panel')).toHaveLength(2);
    expect(wrapper.find('[role="group"][aria-label="Start time"]').exists()).toBe(true);
    expect(wrapper.find('[role="group"][aria-label="End time"]').exists()).toBe(true);
  });

  it('reports the range with the default times once the second day is picked', async () => {
    const wrapper = render();
    await open(wrapper);
    await day(wrapper, 'October 20, 2026').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await day(wrapper, 'October 22, 2026').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    expect(lastEmitted(wrapper)).toEqual({ start: at(20, 0), end: at(22, 0) });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('keeps the times chosen before the days', async () => {
    const wrapper = render();
    await open(wrapper);
    await type(hourOf(wrapper, 'Start time'), '14');
    await type(hourOf(wrapper, 'End time'), '18');
    await day(wrapper, 'October 20, 2026').trigger('click');
    await day(wrapper, 'October 22, 2026').trigger('click');
    expect(lastEmitted(wrapper)).toEqual({ start: at(20, 14), end: at(22, 18) });
  });

  it('changes a time of a complete range', async () => {
    const wrapper = render({ defaultValue: week });
    await open(wrapper);
    await hourOf(wrapper, 'End time').trigger('keydown', { key: 'ArrowUp' });
    expect(lastEmitted(wrapper)).toEqual({ start: at(14, 9, 30), end: at(21, 18, 0) });
  });

  it('sticks the end to the start when the end time is set earlier on the same day', async () => {
    const wrapper = render({ defaultValue: sameDay });
    await open(wrapper);
    await type(hourOf(wrapper, 'End time'), '08');
    expect(lastEmitted(wrapper)).toEqual({ start: at(14, 9, 30), end: at(14, 9, 30) });
  });

  it('sticks the end to the start when the start time is set later than the end', async () => {
    const wrapper = render({ defaultValue: sameDay });
    await open(wrapper);
    await type(hourOf(wrapper, 'Start time'), '19');
    const last = lastEmitted(wrapper) as DateTimeRange;
    expect(last.start).toEqual(last.end);
    expect(last.start.time.hour).toBe(19);
  });
});