import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from '../src/DatePicker.vue';
import DateTimePicker from '../src/DateTimePicker.vue';

const now = () => new Date('2026-10-14T10:00:00Z');
const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });

const mounted: Array<{ unmount: () => void }> = [];
function render(component: typeof DatePicker | typeof DateTimePicker, props = {}) {
  const wrapper = mount(component as typeof DatePicker, {
    props: {
      locale: 'en-US',
      hourCycle: 24,
      now,
      portal: false,
      minDate: oct(10),
      maxDate: oct(20),
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

describe('the clear button and a text that is not a value (ADR 0025)', () => {
  it('is not there while the input is empty', () => {
    expect(render(DatePicker).find('.calendrix-clear').exists()).toBe(false);
  });

  it('DatePicker: clears a text that is not allowed, and gives the focus to the input', async () => {
    const wrapper = render(DatePicker);
    await input(wrapper).setValue('10/25/2026');
    expect(wrapper.find('.calendrix-clear').exists()).toBe(true);
    await wrapper.get('.calendrix-clear').trigger('click');
    expect(input(wrapper).element.value).toBe('');
    expect(wrapper.find('.calendrix-clear').exists()).toBe(false);
    expect(document.activeElement).toBe(input(wrapper).element);
  });

  it('DateTimePicker: clears a text that is not allowed', async () => {
    const wrapper = render(DateTimePicker);
    await input(wrapper).setValue('10/25/2026 09:30');
    await wrapper.get('.calendrix-clear').trigger('click');
    expect(input(wrapper).element.value).toBe('');
    expect(document.activeElement).toBe(input(wrapper).element);
  });
});