import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import Calendar from '../src/Calendar.vue';
import TimeField from '../src/TimeField.vue';

const now = () => new Date(2026, 9, 14);

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

function renderCalendar(props: Record<string, unknown> = {}) {
  const wrapper = mount(Calendar, { props: { now, ...props }, attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

function renderTimeField(props: Record<string, unknown> = {}) {
  const wrapper = mount(TimeField, {
    props: { hourCycle: 24, defaultValue: { hour: 9, minute: 30, second: 0 }, ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}

describe('Calendar: disabled', () => {
  it('is not disabled by default', () => {
    const wrapper = renderCalendar();
    expect(wrapper.attributes('aria-disabled')).toBeUndefined();
    expect(wrapper.find('.calendrix-prev').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[role="grid"] [tabindex="0"]').exists()).toBe(true);
  });

  it('marks the root, disables the buttons and leaves nothing in the tab order', () => {
    const wrapper = renderCalendar({ disabled: true });
    expect(wrapper.attributes('aria-disabled')).toBe('true');
    expect(wrapper.attributes('data-disabled')).toBeDefined();
    expect(wrapper.find('.calendrix-prev').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.calendrix-next').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.calendrix-month-button').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[role="grid"] [tabindex="0"]').exists()).toBe(false);
  });

  it('does not emit when a day is clicked or an arrow key is pressed', async () => {
    const wrapper = renderCalendar({ disabled: true });
    const day = wrapper.findAll('.calendrix-day').find((d) => d.text() === '20');
    await day?.trigger('click');
    await wrapper.get('[role="grid"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.find('.calendrix-month-button').text()).toBe('October');
  });

  it('follows the prop when it changes', async () => {
    const wrapper = renderCalendar();
    await wrapper.setProps({ disabled: true });
    expect(wrapper.attributes('aria-disabled')).toBe('true');
    await wrapper.setProps({ disabled: false });
    await nextTick();
    expect(wrapper.attributes('aria-disabled')).toBeUndefined();
    expect(wrapper.find('[role="grid"] [tabindex="0"]').exists()).toBe(true);
  });
});

describe('TimeField: disabled', () => {
  it('marks the field and takes the segments out of the tab order', () => {
    const wrapper = renderTimeField({ disabled: true });
    expect(wrapper.attributes('aria-disabled')).toBe('true');
    for (const segment of wrapper.findAll('.calendrix-segment')) {
      expect(segment.attributes('tabindex')).toBe('-1');
      expect(segment.attributes('aria-disabled')).toBe('true');
    }
  });

  it('does not change or emit on the arrow keys', async () => {
    const wrapper = renderTimeField({ disabled: true });
    const hour = wrapper.findAll('.calendrix-segment')[0];
    await hour?.trigger('keydown', { key: 'ArrowUp' });
    expect(hour?.text()).toBe('09');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});