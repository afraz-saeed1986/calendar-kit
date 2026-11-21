import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import DateTimePicker from '../src/DateTimePicker.vue';

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const DASH = '\u2013';

const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });
const at = (day: number, hour: number, minute = 0) => ({
  date: oct(day),
  time: { hour, minute, second: 0 },
});

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(DateTimePicker, {
    props: {
      locale: 'en-US',
      hourCycle: 24,
      timeZone: 'UTC',
      now,
      portal: false,
      minDate: oct(10),
      maxDate: oct(20),
      isDateUnavailable: (date: { day: number }) => date.day === 15,
      minTime: { hour: 9, minute: 0, second: 0 },
      maxTime: { hour: 17, minute: 0, second: 0 },
      ...props,
    },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

type Wrapper = ReturnType<typeof render>;
const input = (w: Wrapper) => w.get<HTMLInputElement>('input');
const emitted = (w: Wrapper) => w.emitted('update:modelValue');

describe('DateTimePicker: a typed date and time must be ones the user could pick (ADR 0025)', () => {
  it('accepts a date and a time inside the limits', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/14/2026 09:30');
    expect(emitted(wrapper)?.at(-1)?.[0]).toEqual(at(14, 9, 30));
  });

  it('ignores a time outside minTime and maxTime, and a date outside the limits', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/14/2026 08:30');
    await input(wrapper).setValue('10/14/2026 17:30');
    await input(wrapper).setValue('10/25/2026 09:30');
    await input(wrapper).setValue('10/15/2026 09:30');
    expect(emitted(wrapper)).toBeUndefined();
  });

  it('marks a date that is not allowed as invalid after the blur', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/25/2026 09:30');
    await input(wrapper).trigger('blur');
    await nextTick();
    expect(input(wrapper).attributes('aria-invalid')).toBe('true');
  });

  it('checks the time of both ends of a range', async () => {
    const wrapper = render({ selection: 'range' });
    await input(wrapper).setValue(`10/12/2026 09:30 ${DASH} 10/18/2026 18:00`);
    expect(emitted(wrapper)).toBeUndefined();
    await input(wrapper).setValue(`10/12/2026 09:30 ${DASH} 10/18/2026 17:00`);
    expect(emitted(wrapper)?.at(-1)?.[0]).toEqual({ start: at(12, 9, 30), end: at(18, 17, 0) });
  });
});