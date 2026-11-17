import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import TimeField from '../src/TimeField.vue';

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(TimeField, { props: { hourCycle: 24, ...props }, attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

const texts = (wrapper: ReturnType<typeof render>) =>
  wrapper.findAll('.calendrix-segment').map((s) => s.text());

describe('TimeField', () => {
  it('shows the segments with separators between them', () => {
    const wrapper = render({ defaultValue: { hour: 9, minute: 30, second: 0 } });
    expect(texts(wrapper)).toEqual(['09', '30']);
    expect(wrapper.findAll('.calendrix-separator')).toHaveLength(1);
  });

  it('shows a seconds segment when asked to', () => {
    const wrapper = render({ showSeconds: true });
    expect(wrapper.findAll('.calendrix-segment')).toHaveLength(3);
    expect(wrapper.findAll('.calendrix-separator')).toHaveLength(2);
  });

  it('steps a segment with the arrow keys and emits the new time', async () => {
    const wrapper = render({ defaultValue: { hour: 9, minute: 30, second: 0 } });
    await wrapper.findAll('.calendrix-segment')[0]?.trigger('keydown', { key: 'ArrowUp' });
    expect(texts(wrapper)).toEqual(['10', '30']);
    const [value] = wrapper.emitted('update:modelValue')?.[0] ?? [];
    expect(value).toMatchObject({ hour: 10, minute: 30 });
  });

  it('is controlled by modelValue', async () => {
    const wrapper = render({ modelValue: { hour: 8, minute: 5, second: 0 } });
    expect(texts(wrapper)).toEqual(['08', '05']);
    await wrapper.setProps({ modelValue: { hour: 21, minute: 45, second: 0 } });
    expect(texts(wrapper)).toEqual(['21', '45']);
  });

  it('moves the DOM focus to the next segment when typing completes one', async () => {
    const wrapper = render();
    const hour = wrapper.findAll<HTMLElement>('.calendrix-segment')[0];
    hour?.element.focus();
    await hour?.trigger('keydown', { key: '1' });
    await hour?.trigger('keydown', { key: '4' });
    await nextTick();
    expect(document.activeElement?.getAttribute('data-segment')).toBe('minute');
  });
});