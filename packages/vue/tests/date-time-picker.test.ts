import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import DateTimePicker from '../src/DateTimePicker.vue';

const now = () => new Date(2026, 9, 14);
const value = {
  date: { system: 'gregory' as const, year: 2026, month: 10, day: 5 },
  time: { hour: 9, minute: 30, second: 0 },
};

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(DateTimePicker, {
    props: { now, portal: false, hourCycle: 24, ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

type Wrapper = ReturnType<typeof render>;
const toggle = (w: Wrapper) => w.get('.calendrix-toggle:not(.calendrix-clear)');
const input = (w: Wrapper) => w.get<HTMLInputElement>('input');
const day = (w: Wrapper, label: string) =>
  w.findAll('.calendrix-day').find((d) => d.text() === label);
const lastEmitted = (w: Wrapper) => w.emitted('update:modelValue')?.at(-1)?.[0];

describe('DateTimePicker', () => {
  it('starts empty and closed', () => {
    const wrapper = render();
    expect(input(wrapper).element.value).toBe('');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('opens a popover with a calendar and a time field', async () => {
    const wrapper = render();
    await toggle(wrapper).trigger('click');
    expect(wrapper.find('[role="dialog"] .calendrix-calendar').exists()).toBe(true);
    expect(wrapper.find('[role="dialog"] .calendrix-time-field').exists()).toBe(true);
  });

  it('picks a date at midnight and stays open for the time', async () => {
    const wrapper = render();
    await toggle(wrapper).trigger('click');
    await day(wrapper, '20')?.trigger('click');
    expect(lastEmitted(wrapper)).toMatchObject({
      date: { year: 2026, month: 10, day: 20 },
      time: { hour: 0, minute: 0 },
    });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('starts a picked date at minTime', async () => {
    const wrapper = render({ minTime: { hour: 9, minute: 0, second: 0 } });
    await toggle(wrapper).trigger('click');
    await day(wrapper, '20')?.trigger('click');
    expect(lastEmitted(wrapper)).toMatchObject({ time: { hour: 9, minute: 0 } });
  });

  it('changes the time of the picked date', async () => {
    const wrapper = render({ defaultValue: value });
    await toggle(wrapper).trigger('click');
    await wrapper.findAll('.calendrix-segment')[0]?.trigger('keydown', { key: 'ArrowUp' });
    expect(lastEmitted(wrapper)).toMatchObject({
      date: { day: 5 },
      time: { hour: 10, minute: 30 },
    });
  });

  it('shows a controlled modelValue', async () => {
    const wrapper = render({ modelValue: value });
    expect(input(wrapper).element.value).toContain('2026');
    expect(input(wrapper).element.value).toContain('30');
    await wrapper.setProps({ modelValue: null });
    expect(input(wrapper).element.value).toBe('');
  });

  it('understands the text it writes as its own placeholder', async () => {
    const wrapper = render();
    await input(wrapper).setValue(input(wrapper).attributes('placeholder') ?? '');
    expect(lastEmitted(wrapper)).toMatchObject({
      date: { year: 2026, month: 10, day: 14 },
      time: { hour: 9, minute: 30 },
    });
  });

  it('clears with the clear button', async () => {
    const wrapper = render({ defaultValue: value });
    await wrapper.get('.calendrix-clear').trigger('click');
    expect(lastEmitted(wrapper)).toBeNull();
    expect(input(wrapper).element.value).toBe('');
  });

  it('marks a text that is not a date as invalid after the blur', async () => {
    const wrapper = render();
    await input(wrapper).setValue('abc');
    expect(input(wrapper).attributes('aria-invalid')).toBeUndefined();
    await input(wrapper).trigger('blur');
    await nextTick();
    expect(input(wrapper).attributes('aria-invalid')).toBe('true');
  });

  it('cannot be opened when disabled', () => {
    const wrapper = render({ disabled: true });
    expect(toggle(wrapper).attributes('disabled')).toBeDefined();
    expect(input(wrapper).attributes('disabled')).toBeDefined();
  });
});
