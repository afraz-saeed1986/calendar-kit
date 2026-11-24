import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import TimeField from '../src/TimeField.vue';

const mounted: Array<{ unmount: () => void }> = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(TimeField, {
    props: { locale: 'en-US', hourCycle: 24, ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

type Wrapper = ReturnType<typeof render>;
const segment = (w: Wrapper, type: string) => w.get<HTMLElement>(`[data-segment="${type}"]`);
const text = (w: Wrapper, type: string) => segment(w, type).element.textContent?.trim();

/** Returns false when the handler called `preventDefault()`. */
async function type(w: Wrapper, segmentType: string, data: string, inputType = 'insertText') {
  const notPrevented = segment(w, segmentType).element.dispatchEvent(
    new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }),
  );
  await flushPromises();
  return notPrevented;
}

describe('TimeField: on-screen keyboard (ADR 0024)', () => {
  it('makes the segments editable, with a numeric keyboard', () => {
    const hour = segment(render(), 'hour');
    expect(hour.attributes('contenteditable')).toBe('true');
    expect(hour.attributes('inputmode')).toBe('numeric');
    expect(hour.attributes('enterkeyhint')).toBe('next');
    expect(hour.attributes('spellcheck')).toBe('false');
  });

  it('types a digit, stops the browser from writing, and moves the focus on', async () => {
    const wrapper = render();
    expect(await type(wrapper, 'hour', '1')).toBe(false);
    await type(wrapper, 'hour', '4');
    expect(text(wrapper, 'hour')).toBe('14');
    expect(document.activeElement).toBe(segment(wrapper, 'minute').element);
  });

  it('fills the next segments with a pasted text and reports the value', async () => {
    const wrapper = render();
    await type(wrapper, 'hour', '1430', 'insertFromPaste');
    expect(text(wrapper, 'hour')).toBe('14');
    expect(text(wrapper, 'minute')).toBe('30');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({
      hour: 14,
      minute: 30,
    });
  });

  it('clears on a deletion', async () => {
    const wrapper = render({ defaultValue: { hour: 9, minute: 30, second: 0 } });
    await type(wrapper, 'hour', '', 'deleteContentBackward');
    expect(text(wrapper, 'hour')).toBe('--');
  });

  it('writes the text of the state back after a composition', async () => {
    const wrapper = render();
    const hour = segment(wrapper, 'hour').element;
    hour.textContent = '77';
    hour.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }));
    await flushPromises();
    expect(hour.textContent?.trim()).toBe('--');
  });

  it('is not editable when disabled', () => {
    expect(
      segment(render({ disabled: true }), 'hour').attributes('contenteditable'),
    ).toBeUndefined();
  });
});
