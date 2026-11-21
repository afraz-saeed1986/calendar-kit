import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import DatePicker from '../src/DatePicker.vue';

/** Wednesday, 14 October 2026. */
const now = () => new Date('2026-10-14T10:00:00Z');
const DASH = '\u2013';

const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(DatePicker, {
    props: {
      locale: 'en-US',
      timeZone: 'UTC',
      now,
      portal: false,
      minDate: oct(10),
      maxDate: oct(20),
      isDateUnavailable: (date: { day: number }) => date.day === 15,
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

describe('DatePicker: a typed date must be one the user could pick (ADR 0025)', () => {
  it('accepts a day inside the limits', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/14/2026');
    expect(emitted(wrapper)?.at(-1)?.[0]).toEqual(oct(14));
  });

  it('ignores a day outside the limits and a day that isDateUnavailable marks', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/25/2026');
    await input(wrapper).setValue('10/15/2026');
    expect(emitted(wrapper)).toBeUndefined();
  });

  it('marks a day that is not allowed as invalid after the blur', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/25/2026');
    await input(wrapper).trigger('blur');
    await nextTick();
    expect(input(wrapper).attributes('aria-invalid')).toBe('true');
  });

  it('accepts a range inside the limits, and rejects one with an end outside', async () => {
    const wrapper = render({ selection: 'range' });
    await input(wrapper).setValue(`10/12/2026 ${DASH} 10/25/2026`);
    expect(emitted(wrapper)).toBeUndefined();
    await input(wrapper).setValue(`10/12/2026 ${DASH} 10/18/2026`);
    expect(emitted(wrapper)?.at(-1)?.[0]).toEqual({ start: oct(12), end: oct(18) });
  });

  it('allows an unavailable day inside a range, unless allowUnavailableInRange is false', async () => {
    const allowed = render({ selection: 'range' });
    await input(allowed).setValue(`10/12/2026 ${DASH} 10/18/2026`);
    expect(emitted(allowed)).toHaveLength(1);

    const forbidden = render({ selection: 'range', allowUnavailableInRange: false });
    await input(forbidden).setValue(`10/12/2026 ${DASH} 10/18/2026`);
    expect(emitted(forbidden)).toBeUndefined();
  });
});