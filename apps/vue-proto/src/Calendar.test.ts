import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import Calendar from './Calendar.vue';

// "Today" is 14 October 2026; the calendar shows October 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 14));
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

/** In October 2026 every day label from 8 to 24 appears once, so the text finds the day. */
const day = (wrapper: Pick<VueWrapper, 'findAll'>, label: string) => {
  const found = wrapper.findAll('.calendrix-day').find((item) => item.text() === label);
  if (!found) throw new Error(`No day "${label}"`);
  return found;
};

describe('Calendar (Vue prototype)', () => {
  it('shows the current month', () => {
    const wrapper = mount(Calendar);
    const title = wrapper.findAll('.calendrix-title-text').map((item) => item.text());
    expect(title).toEqual(['October', '2026']);
  });

  it('emits update:modelValue when a day is clicked', async () => {
    const wrapper = mount(Calendar);
    await day(wrapper, '20').trigger('click');
    const events = wrapper.emitted('update:modelValue');
    expect(events).toHaveLength(1);
    expect(events?.[0]?.[0]).toMatchObject({ year: 2026, month: 10, day: 20 });
  });

  it('marks the day of modelValue as selected', async () => {
    const wrapper = mount(Calendar, {
      props: { modelValue: { system: 'gregory', year: 2026, month: 10, day: 20 } },
    });
    expect(day(wrapper, '20').attributes('aria-selected')).toBe('true');
    expect(day(wrapper, '21').attributes('aria-selected')).not.toBe('true');

    await wrapper.setProps({ modelValue: { system: 'gregory', year: 2026, month: 10, day: 21 } });
    expect(day(wrapper, '21').attributes('aria-selected')).toBe('true');
    expect(day(wrapper, '20').attributes('aria-selected')).not.toBe('true');
  });

  it('emits a range only after the second click', async () => {
    const wrapper = mount(Calendar, { props: { selection: 'range' as const } });
    await day(wrapper, '10').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await day(wrapper, '15').trigger('click');
    const value = wrapper.emitted('update:modelValue')?.[0]?.[0];
    expect(value).toMatchObject({
      start: { year: 2026, month: 10, day: 10 },
      end: { year: 2026, month: 10, day: 15 },
    });
  });

  it('moves the DOM focus with the arrow keys', async () => {
    const wrapper = mount(Calendar, { attachTo: document.body });
    await wrapper.find('[role="grid"]').trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    expect(document.activeElement?.textContent?.trim()).toBe('15');
    wrapper.unmount();
  });
});