import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import Calendar from '../src/Calendar.vue';

const now = () => new Date(2026, 9, 14);
const oct = (day: number) => ({ system: 'gregory' as const, year: 2026, month: 10, day });

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(Calendar, { props: { now, ...props }, attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

describe('Calendar', () => {
  it('shows the month with six weeks of days', () => {
    const wrapper = render();
    expect(wrapper.find('.calendrix-month-button').text()).toBe('October');
    expect(wrapper.findAll('.calendrix-day')).toHaveLength(42);
  });

  it('emits the day that was clicked', async () => {
    const wrapper = render();
    const day = wrapper.findAll('.calendrix-day').find((d) => d.text() === '20');
    await day?.trigger('click');
    const [value] = wrapper.emitted('update:modelValue')?.[0] ?? [];
    expect(value).toMatchObject({ year: 2026, month: 10, day: 20 });
  });

  it('is controlled by modelValue', () => {
    const wrapper = render({ modelValue: oct(5) });
    const selected = wrapper.findAll('.calendrix-day[aria-selected="true"]');
    expect(selected.map((d) => d.text())).toEqual(['5']);
  });

  it('opens the months, picks one, and comes back to the days', async () => {
    const wrapper = render();
    await wrapper.find('.calendrix-month-button').trigger('click');
    expect(wrapper.attributes('data-view')).toBe('months');
    expect(wrapper.findAll('.calendrix-month')).toHaveLength(12);

    await wrapper.findAll('.calendrix-month')[2]?.trigger('click');
    expect(wrapper.attributes('data-view')).toBe('days');
    expect(wrapper.find('.calendrix-month-button').text()).toBe('March');
  });

  it('opens the years and leaves them with Escape', async () => {
    const wrapper = render();
    await wrapper.find('.calendrix-year-button').trigger('click');
    expect(wrapper.attributes('data-view')).toBe('years');
    expect(wrapper.findAll('.calendrix-year').length).toBeGreaterThan(0);

    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.attributes('data-view')).toBe('days');
  });

  it('shows several months, each day once', () => {
    const wrapper = render({ visibleMonths: 2 });
    expect(wrapper.findAll('.calendrix-panel')).toHaveLength(2);
    expect(wrapper.findAll('.calendrix-day')).toHaveLength(31 + 30);
  });

  it('emits when a range is complete', async () => {
    const wrapper = render({ selection: 'range' });
    const day = (n: string) => wrapper.findAll('.calendrix-day').find((d) => d.text() === n);
    await day('10')?.trigger('click');
    await day('15')?.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('moves the DOM focus with the arrow keys', async () => {
    const wrapper = render();
    const focused = () => wrapper.find<HTMLElement>('[role="grid"] [tabindex="0"]');
    focused().element.focus();
    await focused().trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    expect(focused().text()).toBe('15');
    expect(document.activeElement).toBe(focused().element);
  });
});
