import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from '../src/DatePicker.vue';

const now = () => new Date('2026-10-14T10:00:00Z');

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

/** Mounts the picker inside nested elements; each entry is the `data-theme` of one level, or null. */
function render(themes: Array<string | null>, props: Record<string, unknown> = {}) {
  let parent: HTMLElement = document.body;
  const created: HTMLElement[] = [];
  for (const theme of themes) {
    const element = document.createElement('div');
    if (theme) element.setAttribute('data-theme', theme);
    parent.appendChild(element);
    created.push(element);
    parent = element;
  }
  const wrapper = mount(DatePicker, {
    props: { locale: 'en-US', now, ...props },
    attachTo: parent,
  });
  cleanups.push(() => {
    wrapper.unmount();
    created[0]?.remove();
  });
  return wrapper;
}

async function open(wrapper: ReturnType<typeof render>) {
  await wrapper.get('.calendrix-toggle:not(.calendrix-clear)').trigger('click');
  await flushPromises();
}
const popover = () => document.body.querySelector<HTMLElement>('.calendrix-popover');

describe('the theme of an ancestor and a portaled popover (ADR 0026)', () => {
  it('copies the data-theme of an ancestor', async () => {
    await open(render(['dark']));
    expect(popover()?.getAttribute('data-theme')).toBe('dark');
  });

  it('copies the nearest one', async () => {
    await open(render(['dark', 'light']));
    expect(popover()?.getAttribute('data-theme')).toBe('light');
  });

  it('sets nothing when no ancestor has a data-theme', async () => {
    await open(render([null]));
    expect(popover()).not.toBeNull();
    expect(popover()?.hasAttribute('data-theme')).toBe(false);
  });

  it('sets nothing when the popover is not portaled', async () => {
    const wrapper = render(['dark'], { portal: false });
    await open(wrapper);
    expect(wrapper.get('.calendrix-popover').attributes('data-theme')).toBeUndefined();
  });
});
