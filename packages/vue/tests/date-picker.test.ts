import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import DatePicker from '../src/DatePicker.vue';

const now = () => new Date(2026, 9, 14);
const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(DatePicker, {
    props: { now, portal: false, ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

const toggle = (wrapper: ReturnType<typeof render>) =>
  wrapper.get('.calendrix-toggle:not(.calendrix-clear)');
const input = (wrapper: ReturnType<typeof render>) => wrapper.get<HTMLInputElement>('input');
const dayButton = (wrapper: ReturnType<typeof render>, label: string) =>
  wrapper.findAll('.calendrix-day').find((d) => d.text() === label);

describe('DatePicker', () => {
  it('starts empty and closed', () => {
    const wrapper = render();
    expect(input(wrapper).element.value).toBe('');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('opens the calendar from the button and with the arrow down key', async () => {
    const wrapper = render();
    await toggle(wrapper).trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    await toggle(wrapper).trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await input(wrapper).trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('puts the popover in the body by default', async () => {
    const wrapper = mount(DatePicker, { props: { now }, attachTo: document.body });
    mounted.push(wrapper);
    await toggle(wrapper).trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('emits the picked day, fills the input and closes', async () => {
    const wrapper = render();
    await toggle(wrapper).trigger('click');
    await dayButton(wrapper, '20')?.trigger('click');
    const [value] = wrapper.emitted('update:modelValue')?.[0] ?? [];
    expect(value).toMatchObject({ year: 2026, month: 10, day: 20 });
    expect(input(wrapper).element.value).toContain('20');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('emits the date that was typed and keeps the text as typed', async () => {
    const wrapper = render();
    await input(wrapper).setValue('10/20/2026');
    const [value] = wrapper.emitted('update:modelValue')?.[0] ?? [];
    expect(value).toMatchObject({ year: 2026, month: 10, day: 20 });
    expect(input(wrapper).element.value).toBe('10/20/2026');
  });

  it('shows a controlled modelValue', async () => {
    const wrapper = render({ modelValue: oct(5) });
    expect(input(wrapper).element.value).toContain('5');
    await wrapper.setProps({ modelValue: oct(9) });
    expect(input(wrapper).element.value).toContain('9');
  });

  it('clears with the clear button', async () => {
    const wrapper = render({ defaultValue: oct(5) });
    expect(input(wrapper).element.value).not.toBe('');
    await wrapper.get('.calendrix-clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    expect(input(wrapper).element.value).toBe('');
  });

  it('stays open after a pick in multiple mode', async () => {
    const wrapper = render({ selection: 'multiple' });
    expect(input(wrapper).attributes('readonly')).toBeDefined();
    await toggle(wrapper).trigger('click');
    await dayButton(wrapper, '3')?.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
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
